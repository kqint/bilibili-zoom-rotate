// ==UserScript==
// @name         B站视频增强：滑条缩放、旋转、拖拽
// @version      5.0.0
// @description  右下角悬停面板控制缩放(50%-250%)/旋转(0-359°)，支持Alt+左键拖拽，条件还原按钮，缩放Toast提示
// @author       kqint
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/list/watchlater/*
// @match        https://www.bilibili.com/medialist/play/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
  'use strict';

  if (window.__newBiliScriptLoaded) {
    return;
  }
  window.__newBiliScriptLoaded = true;

  // 默认配置（仅保留拖拽修饰键）
  const defaultConfig = {
    dragModifierKey: 'altKey',
  };

  let userConfig = {
    dragModifierKey: GM_getValue('dragModifierKey', defaultConfig.dragModifierKey),
  };

  function saveConfig() {
    GM_setValue('dragModifierKey', userConfig.dragModifierKey);
  }

  function getModifierDisplayName(key) {
    const map = {
      'ctrlKey': 'Ctrl',
      'altKey': 'Alt',
      'shiftKey': 'Shift',
      'metaKey': 'Win/Cmd'
    };
    return map[key] || key;
  }

  GM_addStyle(`
    .nbs-control-root {
      position: relative;
      user-select: none;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .nbs-control-root .nbs-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      cursor: pointer;
      margin: 0 auto;
      transition: transform 0.2s ease, width 0.2s ease, height 0.2s ease;
    }

    /* 非全屏模式下的紧凑样式 */
    .nbs-control-root.nbs-compact-mode .nbs-toggle-btn {
      width: 24px;
      height: 24px;
      transform: scale(0.85);
    }
    .nbs-control-root.nbs-compact-mode .nbs-toggle-btn svg {
      width: 16px;
      height: 16px;
    }

    .nbs-control-root .nbs-panel {
      box-sizing: border-box;
      position: absolute;
      right: 50%;
      transform: translateX(50%);
      bottom: 41px;
      display: none;
      flex-direction: column;
      gap: 8px;
      min-width: 260px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #fff;
      background: rgba(32, 32, 32, 0.92);
      backdrop-filter: blur(4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
      z-index: 20;
    }

    .nbs-control-root .nbs-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nbs-control-root .nbs-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.88);
      line-height: 1;
    }

    .nbs-control-root .nbs-scale-line {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nbs-control-root .nbs-scale-slider {
      flex: 1;
      accent-color: var(--bpx-primary-color, #00AEEC);
      cursor: pointer;
    }

    .nbs-control-root .nbs-scale-value {
      min-width: 44px;
      font-size: 12px;
      text-align: right;
      color: #fff;
    }

    /* 旋转按钮区域 - 使用flex布局确保居中 */
    .nbs-control-root .nbs-rotate-items {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin: 4px 0;
    }

    .nbs-control-root .nbs-rotate-slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .nbs-control-root .nbs-rotate-slider {
      flex: 1;
      accent-color: var(--bpx-primary-color, #00AEEC);
      cursor: pointer;
    }
    .nbs-control-root .nbs-rotate-degree {
      min-width: 44px;
      font-size: 12px;
      text-align: right;
      color: #fff;
    }

    .nbs-control-root .nbs-rotate-btn {
      flex: 0 0 auto;
      width: 48px;
      height: 28px;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 12px;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.24);
      transition: background-color 0.18s ease;
    }

    .nbs-control-root .nbs-rotate-btn:hover {
      background: rgba(255, 255, 255, 0.36);
    }

    .nbs-control-root .nbs-rotate-btn.checked {
      background: var(--bpx-primary-color, #00AEEC);
    }

    .nbs-control-root .nbs-tip {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.3;
      text-align: center;
      margin-top: 4px;
    }

    /* 独立还原按钮 - 美化样式，跟随鼠标显隐，响应式缩放 */
    .nbs-reset-btn-global {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      padding: 0 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 36px;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      color: #FB7299;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      z-index: 22;
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    .nbs-reset-btn-global:hover {
      background: rgba(0, 0, 0, 0.9);
      color: #ff85a7;
      transform: translateX(-50%) scale(1.02);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    /* 非全屏紧凑模式缩小还原按钮 */
    .nbs-reset-btn-global.nbs-compact {
      transform: translateX(-50%) scale(0.85);
      font-size: 14px;
      height: 30px;
      padding: 0 16px;
    }
    .nbs-reset-btn-global.nbs-compact:hover {
      transform: translateX(-50%) scale(0.87);
    }
    /* 鼠标静止3秒后隐藏按钮 */
    .nbs-reset-btn-global.hide {
      opacity: 0;
      pointer-events: none;
    }

    /* Toast 提示 - 顶部居中，美化样式，响应式缩放 */
    .nbs-toast {
      position: absolute;
      top: 15%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(16px);
      color: white;
      padding: 14px 32px;
      border-radius: 40px;
      font-size: 18px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.1);
      pointer-events: none;
      z-index: 100;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s ease;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    /* 非全屏紧凑模式缩小Toast */
    .nbs-toast.nbs-compact {
      transform: translateX(-50%) scale(0.85);
      font-size: 14px;
      padding: 10px 24px;
    }
    .nbs-toast.show {
      opacity: 1;
    }

    /* 拖拽时临时禁用视频上的点击事件 */
    .bpx-player-video-wrap.nbs-dragging {
      cursor: grabbing !important;
    }
    .bpx-player-video-wrap.nbs-dragging video {
      pointer-events: none !important;
    }
  `);

  const state = {
    scalePercent: 100,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    justDragged: false,
  };

  const refs = {
    root: null,
    toggleBtn: null,
    panel: null,
    scaleSlider: null,
    scaleValue: null,
    rotateButtons: [],
    rotateSlider: null,
    rotateDegree: null,
    resetButton: null,
    toast: null,
    tipText: null,
  };

  let videoWrap = null;
  let hideTimer = 0;
  let syncTimer = 0;
  let observer = null;
  let toastTimer = null;
  let mouseIdleTimer = null;
  let playerContainer = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isEditableTarget(target) {
    if (!target) return false;
    const el = target;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function getPlayerContainer() {
    return document.querySelector('.bpx-player-container');
  }

  function getVideoWrap() {
    return document.querySelector('.bpx-player-video-wrap');
  }

  function getMediaElement() {
    if (videoWrap) {
      const wrappedVideo = videoWrap.querySelector('video');
      if (wrappedVideo) return wrappedVideo;
    }
    return document.querySelector('video');
  }

  function getRotateFitScale(rotationDeg) {
    const angle = ((rotationDeg % 360) + 360) % 360;
    if (angle === 0) {
      return 1;
    }

    const media = getMediaElement();
    const width = media && media.videoWidth ? media.videoWidth : (videoWrap ? videoWrap.clientWidth : 16);
    const height = media && media.videoHeight ? media.videoHeight : (videoWrap ? videoWrap.clientHeight : 9);
    if (!width || !height) {
      return 1;
    }

    const rad = angle * Math.PI / 180;
    const fitX = width / (width * Math.abs(Math.cos(rad)) + height * Math.abs(Math.sin(rad)));
    const fitY = height / (width * Math.abs(Math.sin(rad)) + height * Math.abs(Math.cos(rad)));
    return Math.min(fitX, fitY);
  }

  function getEffectiveScale() {
    return getRotateFitScale(state.rotation) * (state.scalePercent / 100);
  }

  function isDefaultState() {
    return state.scalePercent === 100 && state.rotation === 0 && state.offsetX === 0 && state.offsetY === 0;
  }

  function updateResetButtonVisibility() {
    if (!refs.resetButton) return;
    if (isDefaultState()) {
      refs.resetButton.style.display = 'none';
    } else {
      refs.resetButton.style.display = 'flex';
    }
  }

  function updateResetButtonPosition() {
    if (!refs.resetButton) return;
    const container = getPlayerContainer();
    if (!container) return;
    const screenMode = container.dataset.screen || 'normal';
    if (screenMode === 'full' || screenMode === 'web') {
      refs.resetButton.style.bottom = '15%';
    } else {
      refs.resetButton.style.bottom = '80px';
    }
  }

  function updatePanelPosition() {
    if (!refs.panel || !refs.toggleBtn) return;
    const container = getPlayerContainer();
    const screenMode = container ? container.dataset.screen : 'normal';
    refs.panel.style.bottom = (screenMode === 'full' || screenMode === 'web') ? '74px' : '41px';
  }

  function updateScaleUI() {
    if (refs.scaleSlider) {
      refs.scaleSlider.value = String(state.scalePercent);
    }
    if (refs.scaleValue) {
      refs.scaleValue.textContent = state.scalePercent + '%';
    }
  }

  function updateRotateUI() {
    refs.rotateButtons.forEach((button) => {
      const angle = Number(button.dataset.angle);
      button.classList.toggle('checked', angle === state.rotation);
    });
    if (refs.rotateSlider) {
      refs.rotateSlider.value = String(state.rotation);
    }
    if (refs.rotateDegree) {
      refs.rotateDegree.textContent = state.rotation + '°';
    }
  }

  function showToast(message) {
    if (!refs.toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.add('show');
    toastTimer = setTimeout(() => {
      if (refs.toast) refs.toast.classList.remove('show');
    }, 1500);
  }

  function applyTransform() {
    if (!videoWrap) return;
    const effectiveScale = getEffectiveScale();
    videoWrap.style.transformOrigin = 'center center';
    videoWrap.style.transition = state.isDragging ? 'none' : 'transform 0.22s ease';
    videoWrap.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) rotate(${state.rotation}deg) scale(${effectiveScale})`;
    updateScaleUI();
    updateRotateUI();
    updateResetButtonVisibility();
    updateResetButtonPosition();
  }

  function setScale(nextScale) {
    const newScale = clamp(Math.round(nextScale), 50, 250);
    if (state.scalePercent === newScale) return;
    state.scalePercent = newScale;
    applyTransform();
    showToast(`缩放: ${state.scalePercent}%`);
  }

  function setRotation(nextRotation) {
    let normalized = ((nextRotation % 360) + 360) % 360;
    normalized = Math.round(normalized);
    if (state.rotation === normalized) return;
    state.rotation = normalized;
    applyTransform();
    showToast(`旋转: ${state.rotation}°`);
  }

  function resetTransform() {
    if (isDefaultState()) return;
    state.scalePercent = 100;
    state.rotation = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    applyTransform();
    showToast('已还原');
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = 0;
    }
  }

  function showPanel() {
    if (!refs.panel) return;
    clearHideTimer();
    updatePanelPosition();
    refs.panel.style.display = 'flex';
  }

  function scheduleHidePanel() {
    clearHideTimer();
    hideTimer = setTimeout(() => {
      if (refs.panel) refs.panel.style.display = 'none';
    }, 180);
  }

  // 键盘缩放已完全删除，函数保留为空
  function onKeydown(event) {
    // 无功能
  }

  function onMouseMove(event) {
    if (!state.isDragging) return;
    state.offsetX = event.clientX - state.dragStartX;
    state.offsetY = event.clientY - state.dragStartY;
    applyTransform();
  }

  function stopDragging() {
    if (!state.isDragging) return;
    state.isDragging = false;
    state.justDragged = true;
    if (videoWrap) {
      videoWrap.classList.remove('nbs-dragging');
    }
    applyTransform();
    setTimeout(() => {
      state.justDragged = false;
    }, 100);
  }

  function onMouseUp(event) {
    if (state.isDragging) {
      stopDragging();
      event.stopPropagation();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function onVideoMouseDown(event) {
    if (event.button !== 0) return;
    if (!event[userConfig.dragModifierKey]) return;

    state.isDragging = true;
    state.dragStartX = event.clientX - state.offsetX;
    state.dragStartY = event.clientY - state.offsetY;

    if (videoWrap) {
      videoWrap.classList.add('nbs-dragging');
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  // 捕获阶段的点击拦截，彻底阻止播放/暂停
  function onCaptureClick(event) {
    if (state.justDragged || state.isDragging) {
      event.stopPropagation();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  // 根据播放器模式更新所有元素的紧凑类
  function updateCompactMode() {
    const container = getPlayerContainer();
    const screenMode = container ? container.dataset.screen : 'normal';
    const isCompact = (screenMode !== 'full' && screenMode !== 'web');
    // 控制面板根元素
    if (refs.root) {
      if (isCompact) {
        refs.root.classList.add('nbs-compact-mode');
      } else {
        refs.root.classList.remove('nbs-compact-mode');
      }
    }
    // 还原按钮
    if (refs.resetButton) {
      if (isCompact) {
        refs.resetButton.classList.add('nbs-compact');
      } else {
        refs.resetButton.classList.remove('nbs-compact');
      }
      updateResetButtonPosition(); // 同时更新位置
    }
    // Toast
    if (refs.toast) {
      if (isCompact) {
        refs.toast.classList.add('nbs-compact');
      } else {
        refs.toast.classList.remove('nbs-compact');
      }
    }
  }

  // 监听播放器模式变化
  function initScreenModeObserver() {
    const container = getPlayerContainer();
    if (!container) return;
    const modeObserver = new MutationObserver(() => {
      updateCompactMode();
      updatePanelPosition();
      updateResetButtonPosition();
    });
    modeObserver.observe(container, { attributes: true, attributeFilter: ['data-screen'] });
    updateCompactMode();
  }

  // 监听播放器容器鼠标移动，控制还原按钮显隐
  function initResetButtonMouseIdle() {
    if (!playerContainer) return;
    const resetBtn = refs.resetButton;
    if (!resetBtn) return;

    const resetIdle = () => {
      if (mouseIdleTimer) clearTimeout(mouseIdleTimer);
      resetBtn.classList.remove('hide');
      mouseIdleTimer = setTimeout(() => {
        if (resetBtn && !resetBtn.matches(':hover')) {
          resetBtn.classList.add('hide');
        }
      }, 3000);
    };

    playerContainer.addEventListener('mousemove', resetIdle);
    resetIdle(); // 初始显示
  }

  // 更新提示文本
  function updateShortcutTip() {
    if (!refs.tipText) return;
    const dragMod = getModifierDisplayName(userConfig.dragModifierKey);
    refs.tipText.innerHTML = `拖拽移动：${dragMod}`;
  }

  // 挂载全局重置按钮
  function mountGlobalResetButton() {
    if (refs.resetButton && refs.resetButton.isConnected) return;
    const container = getPlayerContainer();
    if (!container) return;
    playerContainer = container;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    const btn = document.createElement('button');
    btn.className = 'nbs-reset-btn-global';
    btn.textContent = '还原';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      e.stopImmediatePropagation();
      resetTransform();
    });
    container.appendChild(btn);
    refs.resetButton = btn;
    updateResetButtonVisibility();
    updateCompactMode();      // 确保紧凑样式
    initResetButtonMouseIdle(); // 启动鼠标空闲检测
  }

  function mountToast() {
    if (refs.toast && refs.toast.isConnected) return;
    const container = getPlayerContainer();
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'nbs-toast';
    container.appendChild(toast);
    refs.toast = toast;
    updateCompactMode(); // 应用紧凑样式
  }

  function bindVideoWrap() {
    const nextWrap = getVideoWrap();
    if (!nextWrap) return;
    if (nextWrap === videoWrap) return;

    if (videoWrap) {
      videoWrap.removeEventListener('mousedown', onVideoMouseDown);
      videoWrap.classList.remove('nbs-dragging');
    }

    videoWrap = nextWrap;
    videoWrap.addEventListener('mousedown', onVideoMouseDown);

    // 重置状态
    state.scalePercent = 100;
    state.rotation = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    state.isDragging = false;
    state.justDragged = false;

    applyTransform();
  }

  function mountControlPanel() {
    if (refs.root && refs.root.isConnected) {
      refs.tipText = refs.root.querySelector('.nbs-tip');
      if (refs.tipText) updateShortcutTip();
      updateCompactMode(); // 确保模式类同步
      return;
    }

    const anchor = document.querySelector('.bpx-player-ctrl-btn.bpx-player-ctrl-setting, .bpx-player-ctrl-setting');
    if (!anchor || !anchor.parentElement) return;

    const root = document.createElement('div');
    root.id = 'nbs-control-root';
    root.className = 'bpx-player-ctrl-btn nbs-control-root';
    root.setAttribute('role', 'button');
    root.setAttribute('aria-label', '视频工具');
    root.innerHTML = `
      <div class="nbs-toggle-btn" title="视频工具">
        <span class="bpx-common-svg-icon">
          <svg viewBox="0 0 1024 1024" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M894.4 184.32c0-30.72-25.6-56.32-56.32-56.32H185.92C155.2 128 129.6 153.6 129.6 184.32v250.88h76.8V204.8h611.84v414.72H742.4v76.8h95.68c30.72 0 56.32-25.6 56.32-56.32V184.32z"></path>
            <path fill="currentColor" d="M673.28 469.76H217.6c-49.92 0-89.6 39.68-89.6 89.6v244.48c0 49.92 39.68 89.6 89.6 89.6h455.68c49.92 0 89.6-39.68 89.6-89.6V559.36c0-49.92-39.68-89.6-89.6-89.6zM686.08 806.4c0 7.68-5.12 12.8-12.8 12.8H217.6c-7.68 0-12.8-5.12-12.8-12.8V559.36c0-7.68 5.12-12.8 12.8-12.8h455.68c7.68 0 12.8 5.12 12.8 12.8V806.4z"></path>
            <path fill="currentColor" d="M858.88 760.32l-76.8-76.8-53.76 53.76 76.8 76.8-76.8 76.8 53.76 53.76 76.8-76.8 76.8 76.8 53.76-53.76-76.8-76.8 76.8-76.8-53.76-53.76z"></path>
          </svg>
        </span>
      </div>
      <div class="nbs-panel">
        <div class="nbs-row">
          <span class="nbs-label">视频缩放</span>
          <div class="nbs-scale-line">
            <input class="nbs-scale-slider" type="range" min="50" max="250" step="1" value="100">
            <span class="nbs-scale-value">100%</span>
          </div>
        </div>
        <div class="nbs-row">
          <span class="nbs-label">视频旋转</span>
          <div class="nbs-rotate-items">
            <button class="nbs-rotate-btn checked" type="button" data-angle="0">0°</button>
            <button class="nbs-rotate-btn" type="button" data-angle="90">90°</button>
            <button class="nbs-rotate-btn" type="button" data-angle="180">180°</button>
            <button class="nbs-rotate-btn" type="button" data-angle="270">270°</button>
          </div>
          <div class="nbs-rotate-slider-row">
            <span class="nbs-label" style="font-size:11px">精细旋转</span>
            <input class="nbs-rotate-slider" type="range" min="0" max="359" step="1" value="0">
            <span class="nbs-rotate-degree">0°</span>
          </div>
        </div>
        <div class="nbs-tip"></div>
      </div>
    `;

    anchor.insertAdjacentElement('afterend', root);
    refs.root = root;
    refs.toggleBtn = root.querySelector('.nbs-toggle-btn');
    refs.panel = root.querySelector('.nbs-panel');
    refs.scaleSlider = root.querySelector('.nbs-scale-slider');
    refs.scaleValue = root.querySelector('.nbs-scale-value');
    refs.rotateButtons = Array.from(root.querySelectorAll('.nbs-rotate-btn'));
    refs.rotateSlider = root.querySelector('.nbs-rotate-slider');
    refs.rotateDegree = root.querySelector('.nbs-rotate-degree');
    refs.tipText = root.querySelector('.nbs-tip');

    refs.toggleBtn.addEventListener('mouseenter', showPanel);
    refs.toggleBtn.addEventListener('mouseleave', scheduleHidePanel);
    refs.panel.addEventListener('mouseenter', clearHideTimer);
    refs.panel.addEventListener('mouseleave', scheduleHidePanel);

    refs.scaleSlider.addEventListener('input', (e) => {
      setScale(Number(e.target.value));
    });

    refs.rotateButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const angle = Number(btn.dataset.angle);
        setRotation(angle);
      });
    });

    refs.rotateSlider.addEventListener('input', (e) => {
      const angle = Number(e.target.value);
      setRotation(angle);
    });

    updateShortcutTip();
    updatePanelPosition();
    updateScaleUI();
    updateRotateUI();
    updateCompactMode(); // 应用初始紧凑模式
  }

  function sync() {
    bindVideoWrap();
    mountGlobalResetButton();
    mountToast();
    mountControlPanel();
    updatePanelPosition();
    updateResetButtonPosition();
    applyTransform();
    initScreenModeObserver(); // 监听全屏切换
  }

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = 0;
      sync();
    }, 80);
  }

  function initObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      scheduleSync();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('click', onCaptureClick, true);
    window.addEventListener('resize', () => {
      updatePanelPosition();
      applyTransform();
    });

    initObserver();
    sync();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();