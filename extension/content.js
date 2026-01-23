/**
 * n8n MCP Bridge - Content Script
 *
 * Runs on n8n pages to extract data not available via API:
 * - Current workflow state from UI
 * - Node execution results
 * - User session info
 * - Login credential capture for auto-refresh
 */

(() => {
  'use strict';

  const LOG_PREFIX = '[n8n-mcp]';

  // =============================================================================
  // Page Detection
  // =============================================================================

  function getN8nInstanceUrl() {
    return `${window.location.protocol}//${window.location.host}`;
  }

  function isLoginPage() {
    return window.location.pathname === '/signin' ||
           window.location.pathname === '/login';
  }

  function isWorkflowPage() {
    return window.location.pathname.startsWith('/workflow/');
  }

  function isHomePage() {
    return window.location.pathname === '/home' ||
           window.location.pathname === '/';
  }

  // =============================================================================
  // Data Extraction
  // =============================================================================

  function extractWorkflowId() {
    const match = window.location.pathname.match(/\/workflow\/([^/]+)/);
    return match ? match[1] : null;
  }

  function extractUserInfo() {
    // Try to get user info from n8n's global state
    try {
      const n8nStore = window.__n8n_store__;
      if (n8nStore?.state?.users?.currentUser) {
        return n8nStore.state.users.currentUser;
      }
    } catch {
      // Store not available
    }

    // Fallback: check localStorage
    try {
      const user = localStorage.getItem('n8n-user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  function extractPageData() {
    return {
      url: getN8nInstanceUrl(),
      path: window.location.pathname,
      isLogin: isLoginPage(),
      isWorkflow: isWorkflowPage(),
      workflowId: extractWorkflowId(),
      user: extractUserInfo(),
      timestamp: Date.now()
    };
  }

  // =============================================================================
  // Login Capture (for auto-refresh)
  // =============================================================================

  function showCredentialCaptureNotice() {
    // Show brief, non-intrusive notice that credentials were saved for auto-refresh
    const notice = document.createElement('div');
    notice.id = 'n8n-mcp-notice';
    notice.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #2d3748;
        color: #e2e8f0;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68d391" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>n8n MCP: Credentials saved locally for auto-refresh</span>
      </div>
    `;
    document.body.appendChild(notice);

    // Animate in
    requestAnimationFrame(() => {
      const inner = notice.firstElementChild;
      inner.style.opacity = '1';
      inner.style.transform = 'translateY(0)';
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
      const inner = notice.firstElementChild;
      inner.style.opacity = '0';
      inner.style.transform = 'translateY(10px)';
      setTimeout(() => notice.remove(), 300);
    }, 3000);
  }

  function setupLoginCapture() {
    if (!isLoginPage()) return;

    console.log(LOG_PREFIX, 'Setting up login capture on', window.location.pathname);

    // n8n uses Vue without traditional <form> - find inputs directly
    const findEmailInput = () => {
      return document.querySelector([
        'input[type="email"]',
        'input[name="email"]',
        'input[autocomplete="email"]',
        'input[autocomplete="username"]',
        'input[name="emailOrLdapLoginId"]',
        'input[id*="email"]',
        'input[id*="user"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]'
      ].join(', '));
    };

    const findPasswordInput = () => {
      return document.querySelector('input[type="password"]');
    };

    const findSignInButton = () => {
      // n8n uses a button with "Sign in" text
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.toLowerCase().includes('sign in')) {
          return btn;
        }
      }
      return document.querySelector('button[type="submit"], button.btn--primary');
    };

    const captureCredentials = () => {
      const emailInput = findEmailInput();
      const passwordInput = findPasswordInput();

      console.log(LOG_PREFIX, 'Attempting capture', {
        emailFound: !!emailInput,
        emailValue: emailInput?.value ? '***' : null,
        passwordFound: !!passwordInput,
        passwordValue: passwordInput?.value ? '***' : null
      });

      if (emailInput?.value && passwordInput?.value) {
        chrome.runtime.sendMessage({
          type: 'STORE_CREDENTIALS',
          url: getN8nInstanceUrl(),
          email: emailInput.value,
          password: passwordInput.value
        });
        console.log(LOG_PREFIX, 'Credentials captured for auto-refresh');
        // Show user notice about credential capture
        showCredentialCaptureNotice();
        return true;
      }
      return false;
    };

    // Watch for button to appear and hook it
    const observer = new MutationObserver(() => {
      const signInBtn = findSignInButton();
      if (signInBtn && !signInBtn.dataset.n8nMcpHooked) {
        signInBtn.dataset.n8nMcpHooked = 'true';
        console.log(LOG_PREFIX, 'Sign in button found, hooking click');

        signInBtn.addEventListener('click', () => {
          // Small delay to ensure inputs are filled
          setTimeout(captureCredentials, 100);
        });
      }

      // Also hook Enter key on password field
      const passwordInput = findPasswordInput();
      if (passwordInput && !passwordInput.dataset.n8nMcpHooked) {
        passwordInput.dataset.n8nMcpHooked = 'true';
        console.log(LOG_PREFIX, 'Password input found, hooking Enter key');

        passwordInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            setTimeout(captureCredentials, 100);
          }
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // =============================================================================
  // Workflow Data Extraction
  // =============================================================================

  function extractWorkflowNodes() {
    // Extract node data from the canvas
    const nodes = [];

    try {
      // Try to get from n8n's Vue store
      const n8nStore = window.__n8n_store__;
      if (n8nStore?.state?.workflows?.workflow?.nodes) {
        return n8nStore.state.workflows.workflow.nodes;
      }
    } catch {
      // Store not available
    }

    // Fallback: parse from DOM
    document.querySelectorAll('[data-node-name]').forEach(el => {
      nodes.push({
        name: el.dataset.nodeName,
        type: el.dataset.nodeType
      });
    });

    return nodes;
  }

  function extractExecutionResults() {
    // Extract execution output from the UI
    const results = [];

    try {
      const n8nStore = window.__n8n_store__;
      if (n8nStore?.state?.ndv?.output?.data) {
        return n8nStore.state.ndv.output.data;
      }
    } catch {
      // Store not available
    }

    return results;
  }

  // =============================================================================
  // Communication
  // =============================================================================

  function sendPageData() {
    const data = extractPageData();

    if (isWorkflowPage()) {
      data.nodes = extractWorkflowNodes();
      data.executionResults = extractExecutionResults();
    }

    chrome.runtime.sendMessage({
      type: 'N8N_PAGE_DATA',
      data
    });
  }

  // =============================================================================
  // Initialize
  // =============================================================================

  function init() {
    console.log(LOG_PREFIX, 'Content script loaded on', window.location.href);

    // Setup login capture for auto-refresh
    setupLoginCapture();

    // Send initial page data
    setTimeout(sendPageData, 1000); // Wait for page to fully load

    // Re-send on navigation (SPA)
    let lastPath = window.location.pathname;
    setInterval(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        console.log(LOG_PREFIX, 'Navigation detected:', lastPath);
        setTimeout(sendPageData, 500);
      }
    }, 500);
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
