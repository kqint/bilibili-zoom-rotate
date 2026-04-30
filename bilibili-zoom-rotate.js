// ==UserScript==
// @name         B站视频缩放、旋转
// @namespace    https://github.com/kqint
// @version      6.2.1
// @description  右下角悬停面板控制缩放(50%-350%)/旋转(0-359°)，支持Alt+左键拖拽、Alt+滚轮缩放，快捷缩放/旋转按钮，独立重置，视频记忆，缩放Toast提示，支持直播
// @author       kqint
// @license      MIT
// @homepageURL  https://github.com/kqint/bilibili-zoom-rotate
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/list/watchlater*
// @match        https://www.bilibili.com/medialist/play/*
// @match        https://www.bilibili.com/bangumi/play/*
// @match        https://www.bilibili.com/list/*
// @match        https://live.bilibili.com/*
// @match        https://www.bilibili.com/cheese/play/*
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

  // 快捷键配置
  const shortcutConfig = {
    dragModifierKey: 'altKey',
    wheelZoomModifierKey: 'altKey',
  };

  // Alt+滚轮缩放配置（单位：百分比）
  const wheelZoomConfig = {
    stepPercent: 1,
  };

  // 默认配置
  const defaultConfig = {
    dragModifierKey: shortcutConfig.dragModifierKey,
    wheelZoomModifierKey: shortcutConfig.wheelZoomModifierKey,
    wheelZoomStepPercent: wheelZoomConfig.stepPercent,
  };

  let userConfig = {
    dragModifierKey: GM_getValue('dragModifierKey', defaultConfig.dragModifierKey),
    wheelZoomModifierKey: GM_getValue('wheelZoomModifierKey', defaultConfig.wheelZoomModifierKey),
    wheelZoomStepPercent: GM_getValue('wheelZoomStepPercent', defaultConfig.wheelZoomStepPercent),
  };

  function getModifierDisplayName(key) {
    const map = {
      'altKey': 'Alt',
      'ctrlKey': 'Ctrl',
      'shiftKey': 'Shift',
      'metaKey': 'Meta',
    };
    return map[key] || key;
  }

  GM_addStyle(`
    .nbs-control-root {
      position: relative;
      user-select: none;
      overflow: visible;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fff !important;
      opacity: 1 !important;
    }

    .nbs-control-root .nbs-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      cursor: pointer;
      transition: transform 0.2s ease;
      color: inherit !important;
      opacity: 1 !important;
    }

    .nbs-control-root .bpx-player-ctrl-btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: inherit !important;
      opacity: 1 !important;
    }

    .nbs-control-root .bpx-common-svg-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      color: inherit !important;
      opacity: 1 !important;
    }

    .nbs-control-root .nbs-toggle-btn svg {
      display: block;
      width: 100%;
      height: 100%;
      max-width: 24px;
      max-height: 24px;
      color: inherit !important;
      opacity: 1 !important;
    }

    .nbs-control-root.nbs-compact-mode .nbs-toggle-btn svg {
      max-width: 20px;
      max-height: 20px;
    }

    .bpx-player-container[data-screen=full] .nbs-control-root .nbs-toggle-btn,
    .bpx-player-container[data-screen=web] .nbs-control-root .nbs-toggle-btn {
      position: relative;
      top: -5px;
    }

    .bpx-player-container[data-screen=full] .nbs-control-root .nbs-toggle-btn svg,
    .bpx-player-container[data-screen=web] .nbs-control-root .nbs-toggle-btn svg {
      max-width: 26px;
      max-height: 26px;
      filter: drop-shadow(0 0 0 currentColor);
    }

    .nbs-control-root:hover,
    .nbs-control-root:focus-within,
    .nbs-control-root .nbs-toggle-btn:hover,
    .nbs-control-root .nbs-toggle-btn:focus {
      color: #fff !important;
      opacity: 1 !important;
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
      accent-color: var(--bpx-primary-color, #00A1D6);
      cursor: pointer;
    }

    .nbs-control-root .nbs-scale-value {
      min-width: 44px;
      font-size: 12px;
      text-align: right;
      color: #fff;
    }

    /* 旋转按钮区域 */
    .nbs-control-root .nbs-rotate-items,
    .nbs-control-root .nbs-scale-items {
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
      accent-color: var(--bpx-primary-color, #00A1D6);
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
      cursor: pointer;
      background: rgba(255, 255, 255, 0.24);
      transition: background-color 0.18s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nbs-control-root .nbs-rotate-btn:hover {
      background: rgba(255, 255, 255, 0.36);
    }

    .nbs-control-root .nbs-rotate-btn.checked {
      background: var(--bpx-primary-color, #00A1D6);
    }

    /* 快捷缩放按钮 */
    .nbs-control-root .nbs-scale-btn {
      flex: 0 0 auto;
      width: 48px;
      height: 28px;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 12px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.24);
      transition: background-color 0.18s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nbs-control-root .nbs-scale-btn:hover {
      background: rgba(255, 255, 255, 0.36);
    }

    .nbs-control-root .nbs-scale-btn.checked {
      background: var(--bpx-primary-color, #00A1D6);
    }

    /* 独立重置图标按钮 */
    .nbs-control-root .nbs-reset-icon {
      flex: 0 0 auto;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.18s ease, background 0.18s ease;
      padding: 2px;
    }

    .nbs-control-root .nbs-reset-icon:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.15);
    }

    .nbs-control-root .nbs-tip {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.3;
      text-align: left;
      margin: 0 2px;
      
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
    }

    /* 视频记忆开关 */
    .nbs-control-root .nbs-memory-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
    }
    .nbs-control-root .nbs-memory-row label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.88);
    }
    .nbs-control-root .nbs-memory-toggle {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
    }
    .nbs-control-root .nbs-memory-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .nbs-control-root .nbs-memory-slider {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      transition: background 0.2s ease;
    }
    .nbs-control-root .nbs-memory-slider::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 2px;
      top: 2px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }
    .nbs-control-root .nbs-memory-toggle input:checked + .nbs-memory-slider {
      background: var(--bpx-primary-color, #00A1D6);
    }
    .nbs-control-root .nbs-memory-toggle input:checked + .nbs-memory-slider::before {
      transform: translateX(16px);
    }

    /* 独立还原按钮 */
    .nbs-reset-btn-global {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      padding: 0 28px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 36px;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.5px;
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      color: #EFEFEF;
      cursor: pointer;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      z-index: 22;
      white-space: nowrap;
      transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
      opacity: 0;
      pointer-events: none;
    }
    .nbs-reset-btn-global.show {
      opacity: 1;
      pointer-events: auto;
    }
    .nbs-reset-btn-global:hover {
      background: rgba(0, 0, 0, 0.9);
      color: #a7e9ff;
      transform: translateX(-50%) scale(1.02);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }
    /* 非全屏紧凑模式缩小还原按钮 */
    .nbs-reset-btn-global.nbs-compact {
      height: 28px;
      padding: 0 14px;
      font-size: 13px;
      border-radius: 28px;
    }
    .nbs-reset-btn-global.nbs-compact:hover {
      transform: translateX(-50%) scale(1.05);
    }
    .nbs-reset-btn-global.nbs-hidden-by-player,
    .nbs-toast.nbs-hidden-by-player {
      opacity: 0 !important;
      pointer-events: none !important;
    }
    /* 播放器控制栏隐藏时，还原按钮也隐藏 */
    .bpx-player-container[data-refer=hide] .nbs-reset-btn-global,
    .bpx-player-container[data-refer=hide] .nbs-toast {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* Toast 提示 - 顶部居中 */
    .nbs-toast {
      position: absolute;
      top: 12%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(16px);
      color: white;
      padding: 12px 28px;
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
    /* 强制显示类 */
    .nbs-toast.nbs-force-show {
      opacity: 1 !important;
      pointer-events: none !important;
    }

    /* 拖拽时临时禁用视频上的点击事件 */
    .bpx-player-video-wrap.nbs-dragging {
      cursor: grabbing !important;
    }
    .bpx-player-video-wrap.nbs-dragging video {
      pointer-events: none !important;
    }

    /* 直播页面视频包裹层拖拽 */
    .nbs-live-video-wrap.nbs-dragging {
      cursor: grabbing !important;
    }
    .nbs-live-video-wrap.nbs-dragging video {
      pointer-events: none !important;
    }

    /* 直播页面控制按钮定位 - 浮动按钮 */
    .nbs-control-root.nbs-live-control {
      position: absolute !important;
      bottom: 55px !important;
      right: 116px !important;
      z-index: 20 !important;
      width: 38px !important;
      height: 38px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: rgba(0, 0, 0, 0.55) !important;
      border-radius: 50% !important;
      backdrop-filter: blur(4px) !important;
      color: #fff !important;
      cursor: pointer !important;
    }
    .nbs-control-root.nbs-live-control.nbs-hidden-by-player {
      opacity: 0 !important;
      pointer-events: none !important;
    }
    .nbs-control-root.nbs-live-control .nbs-panel {
      bottom: 46px !important;
    }
  `);

  const state = {
    scalePercent: 100,
    rotation: 0,
    // 使用百分比存储偏移（-1 到 1 范围，表示视频容器宽高的百分比）
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    // 拖拽开始时的初始偏移百分比
    dragStartOffsetX: 0,
    dragStartOffsetY: 0,
    // 拖拽开始时的鼠标位置
    dragStartClientX: 0,
    dragStartClientY: 0,
    justDragged: false,
  };

  const refs = {
    root: null,
    toggleBtn: null,
    panel: null,
    scaleSlider: null,
    scaleValue: null,
    scaleButtons: [],
    scaleReset: null,
    rotateButtons: [],
    rotateSlider: null,
    rotateDegree: null,
    rotateReset: null,
    resetButton: null,
    toast: null,
    tipText: null,
    memoryToggle: null,
  };

  let videoWrap = null;
  let hideTimer = 0;
  let syncTimer = 0;
  let observer = null;
  let toastTimer = null;
  let lastSyncedContainer = null;
  let controlBarObserver = null;
  let observedControlContainer = null;
  let controlVisibilityRaf = 0;
  // 全屏切换防抖
  let screenModeChangeTimer = null;
  let isScreenModeChanging = false;
  let screenModeObserver = null;
  let observedScreenModeContainer = null;
  let currentVideoId = null;
  let saveStateTimer = null;
  let videoMemoryEnabled = localStorage.getItem('nbs_memoryEnabled') !== 'false';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isLivePage() {
    return location.hostname === 'live.bilibili.com';
  }

  function getPlayerContainer() {
    if (isLivePage()) {
      return document.querySelector('#live-player');
    }
    return document.querySelector('.bpx-player-container');
  }

  function getVideoWrap() {
    if (isLivePage()) {
      return getLiveVideoWrap();
    }
    return document.querySelector('.bpx-player-video-wrap');
  }

  function getLiveVideoWrap() {
    const container = getPlayerContainer();
    if (!container) return null;

    // 复用已创建的包裹层
    let wrap = container.querySelector('.nbs-live-video-wrap');
    if (wrap) return wrap;

    const video = container.querySelector('video');
    if (!video) return null;

    wrap = document.createElement('div');
    wrap.className = 'nbs-live-video-wrap';
    wrap.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:2';

    video.parentNode.insertBefore(wrap, video);
    wrap.appendChild(video);

    return wrap;
  }

  function getMediaElement() {
    if (videoWrap) {
      const wrappedVideo = videoWrap.querySelector('video');
      if (wrappedVideo) return wrappedVideo;
    }
    return document.querySelector('video');
  }

  function getVideoId() {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    let bvid = null;
    const pathMatch = path.match(/\/(?:video|list\/watchlater)\/(BV[^/?#]+)/);
    if (pathMatch) {
      bvid = pathMatch[1];
    }

    if (!bvid) {
      bvid = urlParams.get('bvid');
    }

    if (bvid) {
      const p = urlParams.get('p');
      return p ? `${bvid}-p${p}` : bvid;
    }
    return path;
  }

  function saveVideoState() {
    if (!videoMemoryEnabled || !currentVideoId) return;
    const key = 'nbs_videoState_' + currentVideoId;
    if (isDefaultState()) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify({
      scalePercent: state.scalePercent,
      rotation: state.rotation,
      offsetX: state.offsetX,
      offsetY: state.offsetY,
    }));
  }

  function scheduleSaveState() {
    if (saveStateTimer) clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
      saveStateTimer = 0;
      saveVideoState();
    }, 500);
  }

  function loadVideoState(videoId) {
    if (!videoId) return false;
    try {
      const raw = localStorage.getItem('nbs_videoState_' + videoId);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.scalePercent !== 'number') return false;
      state.scalePercent = clamp(Math.round(saved.scalePercent), 50, 350);
      state.rotation = ((saved.rotation % 360) + 360) % 360;
      state.offsetX = clamp(Number(saved.offsetX) || 0, -1, 1);
      state.offsetY = clamp(Number(saved.offsetY) || 0, -1, 1);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getControlVisibilityElement() {
    if (isLivePage()) return null;
    const container = getPlayerContainer();
    if (!container) return null;
    return container.querySelector('.bpx-player-control-bottom')
      || container.querySelector('.bpx-player-control-wrap')
      || container.querySelector('.bpx-player-control-entity');
  }

  function isElementActuallyVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    if (Number(style.opacity || '1') <= 0.05) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function syncPlayerOverlayVisibility() {
    const container = getPlayerContainer();
    const controlBar = getControlVisibilityElement();
    const shouldHide = Boolean(
      container
      && (
        container.dataset.refer === 'hide'
        || (controlBar && !isElementActuallyVisible(controlBar))
      )
    );
    // 还原按钮悬浮时不隐藏
    const isResetButtonHovered = refs.resetButton && refs.resetButton.dataset.hover === 'true';
    if (refs.resetButton) {
      refs.resetButton.classList.toggle('nbs-hidden-by-player', shouldHide && !isResetButtonHovered);
    }
    
    // Toast 强制显示时不隐藏
    if (refs.toast && !refs.toast.classList.contains('nbs-force-show')) {
      refs.toast.classList.toggle('nbs-hidden-by-player', shouldHide);
    }
  }

  function scheduleOverlayVisibilitySync() {
    if (controlVisibilityRaf) return;
    controlVisibilityRaf = requestAnimationFrame(() => {
      controlVisibilityRaf = 0;
      syncPlayerOverlayVisibility();
    });
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
      refs.resetButton.classList.remove('show');
    } else {
      refs.resetButton.classList.add('show');
    }
    scheduleOverlayVisibilitySync();
  }

  function updateResetButtonPosition() {
    if (!refs.resetButton) return;
    const container = getPlayerContainer();
    if (!container) return;
    if (isLivePage()) {
      refs.resetButton.style.bottom = '120px';
      return;
    }
    const screenMode = container.dataset.screen || 'normal';
    // 计算还原按钮位置：基于播放器高度的百分比
    const containerHeight = container.clientHeight || 600;
    if (screenMode === 'full' || screenMode === 'web') {
      // 全屏/网页全屏
      refs.resetButton.style.bottom = Math.round(containerHeight * 0.12) + 'px';
    } else {
      // 非全屏
      refs.resetButton.style.bottom = '120px';
    }
  }

  function updatePanelPosition() {
    if (!refs.panel || !refs.toggleBtn) return;
    if (isLivePage()) {
      refs.panel.style.bottom = '46px';
      return;
    }
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
    refs.scaleButtons.forEach((btn) => {
      const s = Number(btn.dataset.scale);
      btn.classList.toggle('checked', s === state.scalePercent);
    });
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
    
    // 强制显示模式：添加强制显示类，忽略播放器隐藏状态
    refs.toast.classList.add('nbs-force-show');
    refs.toast.classList.remove('nbs-hidden-by-player');
    
    refs.toast.textContent = message;
    refs.toast.classList.add('show');
    
    toastTimer = setTimeout(() => {
      if (refs.toast) {
        refs.toast.classList.remove('show');
        refs.toast.classList.remove('nbs-force-show');
        // 恢复同步状态检查
        scheduleOverlayVisibilitySync();
      }
    }, 1500);
  }

  function applyTransform() {
    if (!videoWrap) return;
    const effectiveScale = getEffectiveScale();
    // 将百分比偏移转换为像素值（基于视频容器当前尺寸）
    const containerWidth = videoWrap.clientWidth || 1;
    const containerHeight = videoWrap.clientHeight || 1;
    const pixelOffsetX = state.offsetX * containerWidth;
    const pixelOffsetY = state.offsetY * containerHeight;
    videoWrap.style.transformOrigin = 'center center';
    // 全屏切换期间禁用过渡动画以提升性能
    const useTransition = !state.isDragging && !isScreenModeChanging;
    videoWrap.style.transition = useTransition ? 'transform 0.22s ease' : 'none';
    videoWrap.style.transform = `translate(${pixelOffsetX}px, ${pixelOffsetY}px) rotate(${state.rotation}deg) scale(${effectiveScale})`;
    updateScaleUI();
    updateRotateUI();
    updateResetButtonVisibility();
    updateResetButtonPosition();
  }

  function setScale(nextScale) {
    const newScale = clamp(Math.round(nextScale), 50, 350);
    if (state.scalePercent === newScale) return;
    state.scalePercent = newScale;
    applyTransform();
    scheduleSaveState();
    showToast(`缩放: ${state.scalePercent}%`);
  }

  function setRotation(nextRotation) {
    let normalized = ((nextRotation % 360) + 360) % 360;
    normalized = Math.round(normalized);
    if (state.rotation === normalized) return;
    state.rotation = normalized;
    applyTransform();
    scheduleSaveState();
    showToast(`旋转: ${state.rotation}°`);
  }

  function resetScale() {
    if (state.scalePercent === 100) return;
    state.scalePercent = 100;
    applyTransform();
    scheduleSaveState();
    showToast('缩放已重置');
  }

  function resetRotation() {
    if (state.rotation === 0) return;
    state.rotation = 0;
    applyTransform();
    scheduleSaveState();
    showToast('旋转已重置');
  }

  function resetTransform() {
    if (isDefaultState()) return;
    state.scalePercent = 100;
    state.rotation = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    applyTransform();
    scheduleSaveState();
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

  // 快捷键 + 鼠标滚轮控制缩放
  function onWheel(event) {
    // 检查是否按住配置的快捷键
    if (!event[userConfig.wheelZoomModifierKey]) return;
    
    // 检查目标是否在视频区域内
    const target = event.target;
    if (!videoWrap || !videoWrap.contains(target)) return;
    
    // 阻止默认滚轮行为（页面滚动）
    event.preventDefault();
    event.stopPropagation();
    
    // 根据滚轮方向和配置精度调整缩放
    const step = Math.max(1, Math.round(Number(userConfig.wheelZoomStepPercent) || 1));
    const delta = event.deltaY > 0 ? -step : step;
    const newScale = state.scalePercent + delta;
    setScale(newScale);
  }

  function onMouseMove(event) {
    if (!state.isDragging || !videoWrap) return;
    // 计算鼠标移动的像素差值
    const deltaX = event.clientX - state.dragStartClientX;
    const deltaY = event.clientY - state.dragStartClientY;
    // 转换为百分比偏移（基于当前视频容器尺寸）
    const containerWidth = videoWrap.clientWidth || 1;
    const containerHeight = videoWrap.clientHeight || 1;
    state.offsetX = state.dragStartOffsetX + deltaX / containerWidth;
    state.offsetY = state.dragStartOffsetY + deltaY / containerHeight;
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
    scheduleSaveState();
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
    // 记录拖拽开始时的偏移百分比和鼠标位置
    state.dragStartOffsetX = state.offsetX;
    state.dragStartOffsetY = state.offsetY;
    state.dragStartClientX = event.clientX;
    state.dragStartClientY = event.clientY;

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
    let isCompact;
    if (isLivePage()) {
      isCompact = !document.fullscreenElement;
    } else {
      const container = getPlayerContainer();
      const screenMode = container ? container.dataset.screen : 'normal';
      isCompact = (screenMode !== 'full' && screenMode !== 'web');
    }
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

    // 容器没变且已有 observer，跳过
    if (observedScreenModeContainer === container && screenModeObserver) {
      return;
    }

    // 断开旧的 observer
    if (screenModeObserver) {
      screenModeObserver.disconnect();
    }

    observedScreenModeContainer = container;
    screenModeObserver = new MutationObserver(() => {
      // 防抖处理：全屏切换期间标记状态，禁用过渡动画
      if (screenModeChangeTimer) {
        clearTimeout(screenModeChangeTimer);
      }
      isScreenModeChanging = true;
      // 立即应用一次transform（无过渡）
      applyTransform();
      // 延迟更新UI，等待全屏动画完成
      screenModeChangeTimer = setTimeout(() => {
        isScreenModeChanging = false;
        applyTransform();
        updateCompactMode();
        updatePanelPosition();
        updateResetButtonPosition();
      }, 150);
    });
    screenModeObserver.observe(container, { attributes: true, attributeFilter: ['data-screen'] });
    updateCompactMode();
    updateResetButtonPosition();
  }

  // 监听播放器控制栏显隐状态，同步控制还原按钮显隐
  function initControlBarObserver() {
    const container = getPlayerContainer();
    if (!container) return;

    if (observedControlContainer === container && controlBarObserver) {
      scheduleOverlayVisibilitySync();
      return;
    }

    if (observedControlContainer && observedControlContainer !== container) {
      observedControlContainer.removeEventListener('mousemove', scheduleOverlayVisibilitySync, true);
      observedControlContainer.removeEventListener('mouseleave', scheduleOverlayVisibilitySync, true);
    }

    if (controlBarObserver) {
      controlBarObserver.disconnect();
    }

    observedControlContainer = container;
    controlBarObserver = new MutationObserver(() => {
      scheduleOverlayVisibilitySync();
    });
    controlBarObserver.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-refer', 'class', 'style', 'data-state']
    });

    container.addEventListener('mousemove', scheduleOverlayVisibilitySync, true);
    container.addEventListener('mouseleave', scheduleOverlayVisibilitySync, true);
    scheduleOverlayVisibilitySync();
  }

  // 更新提示文本
  function updateShortcutTip() {
    if (!refs.tipText) return;
    const dragMod = getModifierDisplayName(userConfig.dragModifierKey);
    const wheelMod = getModifierDisplayName(userConfig.wheelZoomModifierKey);
    const wheelStep = Math.max(1, Math.round(Number(userConfig.wheelZoomStepPercent) || 1));
    refs.tipText.innerHTML = `拖拽移动：${dragMod} + 鼠标左键<br>滚轮缩放：${wheelMod} + 滚轮（步进 ${wheelStep}%）<br>记住视频状态：开启后，下次打开相同视频自动恢复上次的缩放/旋转/位置`;
  }

  // 挂载全局重置按钮
  function mountGlobalResetButton() {
    if (refs.resetButton && refs.resetButton.isConnected) return;
    const container = getPlayerContainer();
    if (!container) return;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    const btn = document.createElement('button');
    btn.className = 'nbs-reset-btn-global';
    btn.textContent = '还原屏幕';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      e.stopImmediatePropagation();
      resetTransform();
    });
    // 鼠标悬浮时阻止隐藏
    btn.addEventListener('mouseenter', () => {
      btn.dataset.hover = 'true';
    });
    btn.addEventListener('mouseleave', () => {
      delete btn.dataset.hover;
      scheduleOverlayVisibilitySync();
    });
    container.appendChild(btn);
    refs.resetButton = btn;
    updateResetButtonVisibility();
    updateCompactMode();      // 确保紧凑样式
    updateResetButtonPosition(); // 更新位置
    initControlBarObserver();   // 监听控制栏显隐
    scheduleOverlayVisibilitySync();
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
    scheduleOverlayVisibilitySync();
  }

  function bindVideoWrap() {
    const nextWrap = getVideoWrap();
    const newVideoId = getVideoId();
    const wrapChanged = (nextWrap !== videoWrap);
    const videoIdChanged = (newVideoId !== currentVideoId);

    // 视频切换时，先保存旧视频状态（必须在检查 nextWrap 是否存在之前）
    if (videoWrap && currentVideoId && (wrapChanged || videoIdChanged)) {
      saveVideoState();
      if (saveStateTimer) {
        clearTimeout(saveStateTimer);
        saveStateTimer = 0;
      }
    }

    if (!nextWrap) return;
    if (!wrapChanged && !videoIdChanged) return;

    // 清理旧的 videoWrap
    if (videoWrap && wrapChanged) {
      videoWrap.removeEventListener('mousedown', onVideoMouseDown);
      videoWrap.removeEventListener('wheel', onWheel);
      videoWrap.classList.remove('nbs-dragging');
    }

    // 绑定新的 videoWrap
    if (wrapChanged) {
      videoWrap = nextWrap;
      videoWrap.addEventListener('mousedown', onVideoMouseDown);
      videoWrap.addEventListener('wheel', onWheel, { passive: false });
    }

    currentVideoId = newVideoId;

    // 尝试加载保存的状态
    if (!videoMemoryEnabled || !loadVideoState(newVideoId)) {
      state.scalePercent = 100;
      state.rotation = 0;
      state.offsetX = 0;
      state.offsetY = 0;
    }
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

    const container = getPlayerContainer();
    if (!container) return;

    let root;

    // 直播页面：追加到播放器容器底部控制栏区域
    if (isLivePage()) {
      container.style.position = 'relative';
      root = document.createElement('div');
      root.id = 'nbs-control-root';
      root.className = 'nbs-control-root nbs-live-control';
      root.setAttribute('role', 'button');
      container.appendChild(root);
      // 基于无操作定时器自动隐藏（直播控制栏本身基于无操作隐藏）
      let activityTimer;
      const INACTIVITY_DELAY = 3000;
      const onActivity = () => {
        root.classList.remove('nbs-hidden-by-player');
        clearTimeout(activityTimer);
        activityTimer = setTimeout(() => root.classList.add('nbs-hidden-by-player'), INACTIVITY_DELAY);
      };
      container.addEventListener('mousemove', onActivity);
      container.addEventListener('mouseenter', onActivity);
      // 悬停在按钮/面板上时保持显示
      root.addEventListener('mouseenter', () => clearTimeout(activityTimer));
      root.addEventListener('mouseleave', () => {
        clearTimeout(activityTimer);
        activityTimer = setTimeout(() => root.classList.add('nbs-hidden-by-player'), INACTIVITY_DELAY);
      });
      // 初始显示后延迟隐藏
      activityTimer = setTimeout(() => root.classList.add('nbs-hidden-by-player'), INACTIVITY_DELAY);
    } else {
      const anchor = container && container.querySelector('.bpx-player-ctrl-btn.bpx-player-ctrl-setting, .bpx-player-ctrl-setting');
      if (!anchor || !anchor.parentElement) return;
      root = document.createElement('div');
      root.id = 'nbs-control-root';
      root.className = 'bpx-player-ctrl-btn nbs-control-root';
      root.setAttribute('role', 'button');
      anchor.insertAdjacentElement('afterend', root);
    }

    root.innerHTML = `
      <div class="bpx-player-ctrl-btn-icon nbs-toggle-btn">
        <span class="bpx-common-svg-icon">
          <svg viewBox="0 0 1024 1024" aria-hidden="true">
            <path fill="currentColor" d="M894.4 184.32c0-30.72-25.6-56.32-56.32-56.32H185.92C155.2 128 129.6 153.6 129.6 184.32v250.88h76.8V204.8h611.84v414.72H742.4v76.8h95.68c30.72 0 56.32-25.6 56.32-56.32V184.32z"></path>
            <path fill="currentColor" d="M673.28 469.76H217.6c-49.92 0-89.6 39.68-89.6 89.6v244.48c0 49.92 39.68 89.6 89.6 89.6h455.68c49.92 0 89.6-39.68 89.6-89.6V559.36c0-49.92-39.68-89.6-89.6-89.6zM686.08 806.4c0 7.68-5.12 12.8-12.8 12.8H217.6c-7.68 0-12.8-5.12-12.8-12.8V559.36c0-7.68 5.12-12.8 12.8-12.8h455.68c7.68 0 12.8 5.12 12.8 12.8V806.4z"></path>
            <path fill="currentColor" d="M858.88 760.32l-76.8-76.8-53.76 53.76 76.8 76.8-76.8 76.8 53.76 53.76 76.8-76.8 76.8 76.8 53.76-53.76-76.8-76.8 76.8-76.8-53.76-53.76z"></path>
          </svg>
        </span>
      </div>
      <div class="nbs-panel">
        <div class="nbs-row">
          <span class="nbs-label">视频缩放</span>
          <div class="nbs-scale-items">
            <button class="nbs-scale-btn checked" type="button" data-scale="150">150%</button>
            <button class="nbs-scale-btn" type="button" data-scale="200">200%</button>
            <button class="nbs-scale-btn" type="button" data-scale="250">250%</button>
            <button class="nbs-scale-btn" type="button" data-scale="300">300%</button>
          </div>
          <div class="nbs-scale-line">
            <input class="nbs-scale-slider" type="range" min="50" max="350" step="1" value="100">
            <span class="nbs-scale-value">100%</span>
            <button class="nbs-reset-icon" title="重置缩放"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
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
            <input class="nbs-rotate-slider" type="range" min="0" max="359" step="1" value="0">
            <span class="nbs-rotate-degree">0°</span>
            <button class="nbs-reset-icon" title="重置旋转"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
          </div>
        </div>
        <div class="nbs-memory-row">
          <label>
            <span>记住视频状态</span>
            <span class="nbs-memory-toggle">
              <input type="checkbox" checked>
              <span class="nbs-memory-slider"></span>
            </span>
          </label>
        </div>
        <div class="nbs-tip"></div>
      </div>
    `;

    refs.root = root;
    refs.toggleBtn = root.querySelector('.nbs-toggle-btn');
    refs.panel = root.querySelector('.nbs-panel');
    refs.scaleSlider = root.querySelector('.nbs-scale-slider');
    refs.scaleValue = root.querySelector('.nbs-scale-value');
    refs.scaleButtons = Array.from(root.querySelectorAll('.nbs-scale-btn'));
    refs.scaleReset = root.querySelector('.nbs-scale-line .nbs-reset-icon');
    refs.rotateButtons = Array.from(root.querySelectorAll('.nbs-rotate-btn'));
    refs.rotateSlider = root.querySelector('.nbs-rotate-slider');
    refs.rotateDegree = root.querySelector('.nbs-rotate-degree');
    refs.rotateReset = root.querySelector('.nbs-rotate-slider-row .nbs-reset-icon');
    refs.tipText = root.querySelector('.nbs-tip');
    refs.memoryToggle = root.querySelector('.nbs-memory-toggle input');
    if (refs.memoryToggle) {
      refs.memoryToggle.checked = videoMemoryEnabled;
      refs.memoryToggle.addEventListener('change', () => {
        videoMemoryEnabled = refs.memoryToggle.checked;
        localStorage.setItem('nbs_memoryEnabled', videoMemoryEnabled ? 'true' : 'false');
        if (!videoMemoryEnabled && currentVideoId) {
          localStorage.removeItem('nbs_videoState_' + currentVideoId);
        }
      });
    }

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

    refs.scaleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = Number(btn.dataset.scale);
        setScale(s);
      });
    });

    if (refs.scaleReset) {
      refs.scaleReset.addEventListener('click', (e) => {
        e.stopPropagation();
        resetScale();
      });
    }

    if (refs.rotateReset) {
      refs.rotateReset.addEventListener('click', (e) => {
        e.stopPropagation();
        resetRotation();
      });
    }

    updateShortcutTip();
    updatePanelPosition();
    updateScaleUI();
    updateRotateUI();
    updateCompactMode(); // 应用初始紧凑模式
    updateResetButtonPosition(); // 确保初始位置正确
  }

  function sync() {
    const container = getPlayerContainer();
    const containerChanged = (container !== lastSyncedContainer);

    bindVideoWrap();
    mountGlobalResetButton();
    mountToast();
    mountControlPanel();

    if (containerChanged) {
      lastSyncedContainer = container;
      initScreenModeObserver();
      initControlBarObserver();
    }

    updatePanelPosition();
    updateResetButtonPosition();
    applyTransform();
    scheduleOverlayVisibilitySync();
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
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('click', onCaptureClick, true);
    window.addEventListener('resize', () => {
      updatePanelPosition();
      applyTransform();
    });

    // 直播页面全屏切换监听
    if (isLivePage()) {
      document.addEventListener('fullscreenchange', () => {
        updateCompactMode();
        applyTransform();
      });
    }

    initObserver();
    sync();

  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
