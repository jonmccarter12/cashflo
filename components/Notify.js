export function notify(msg, type = 'success', options = {}){
  if(typeof window!=='undefined'){
    const colors = {
      success: '#10b981',
      error: '#dc2626',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; background: ${colors[type] || colors.info}; color: white;
      padding: 0.75rem 1rem; border-radius: 0.5rem; z-index: 9999;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      transform: translateX(100%); transition: transform 0.3s ease;
      max-width: 400px; word-wrap: break-word;
      display: flex; align-items: center; gap: 1rem; justify-content: space-between;
    `;

    const msgSpan = document.createElement('span');
    msgSpan.textContent = msg;
    msgSpan.style.flex = '1';
    toast.appendChild(msgSpan);

    // Add action button if provided
    if (options.action) {
      const actionBtn = document.createElement('button');
      actionBtn.textContent = options.actionLabel || 'Undo';
      actionBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 0.25rem;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.875rem;
        transition: background 0.2s;
      `;
      actionBtn.onmouseover = () => actionBtn.style.background = 'rgba(255, 255, 255, 0.3)';
      actionBtn.onmouseout = () => actionBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      actionBtn.onclick = () => {
        options.action();
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
      };
      toast.appendChild(actionBtn);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);

    const duration = options.duration || 5000;
    const timeoutId = setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
    }, duration);

    // If action exists, store timeout so we can cancel it if action is clicked
    if (options.action) {
      toast._timeoutId = timeoutId;
    }
  }
}
