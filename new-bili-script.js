// ==UserScript==
// @name         B站视频增强：滑条缩放、旋转、拖拽
// @version      1.0.0
// @description  右下角悬停面板控制缩放/旋转，支持Alt+左键拖拽与条件还原按钮
// @author       kqint
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/list/watchlater*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_addStyle
// ==/UserScript==

(function() {
  'use strict';

  if (window.__newBiliScriptLoaded) {
    return;
  }
  window.__newBiliScriptLoaded = true;

  GM_addStyle(`
    .nbs-control-root {
      position: relative;
      user-select: none;
    }

    .nbs-control-root .nbs-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      cursor: pointer;
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
      min-width: 240px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #fff;
      background: rgba(32, 32, 32, 0.92);
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

    .nbs-control-root .nbs-rotate-items {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .nbs-control-root .nbs-rotate-btn {
      height: 24px;
      border: none;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
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
    }

    .nbs-reset-btn {
      position: absolute;
      left: 50%;
      bottom: 54px;
      transform: translateX(-50%);
      display: none;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 56px;
      padding: 0 12px;
      border: none;
      border-radius: 999px;
      font-size: 12px;
      color: #fff;
      cursor: pointer;
      background: rgba(255, 87, 87, 0.92);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
      z-index: 22;
    }

    .bpx-player-video-wrap.nbs-dragging {
      cursor: grabbing !important;
    }
  `);

  const state = {
    scalePercent: 100,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
  };

  const config = {
    dragModifierKey: 'altKey',
    dragModifierLabel: 'Alt',
    dragMouseButton: 0
  };

  const refs = {
    root: null,
    toggleBtn: null,
    panel: null,
    scaleSlider: null,
    scaleValue: null,
    rotateButtons: [],
    resetButton: null
  };

  let videoWrap = null;
  let hideTimer = 0;
  let syncTimer = 0;
  let observer = null;

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

  function updatePanelPosition() {
    if (!refs.panel || !refs.toggleBtn) return;
    const screenMode = getPlayerContainer() ? getPlayerContainer().dataset.screen : 'normal';
    refs.panel.style.bottom = (screenMode === 'full' || screenMode === 'web') ? '74px' : '41px';
  }

  function updateResetButtonPosition() {
    if (!refs.resetButton) return;
    const screenMode = getPlayerContainer() ? getPlayerContainer().dataset.screen : 'normal';
    refs.resetButton.style.bottom = (screenMode === 'full' || screenMode === 'web') ? '86px' : '54px';
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
  }

  function updateResetButtonVisibility() {
    if (!refs.resetButton) return;
    refs.resetButton.style.display = state.scalePercent !== 100 ? 'inline-flex' : 'none';
  }

  function applyTransform() {
    if (!videoWrap) return;
    const effectiveScale = getEffectiveScale();
    videoWrap.style.transformOrigin = 'center center';
    videoWrap.style.transition = state.isDragging ? 'none' : 'transform 0.22s ease';
    videoWrap.style.transform = 'translate(' + state.offsetX + 'px, ' + state.offsetY + 'px) rotate(' + state.rotation + 'deg) scale(' + effectiveScale + ')';
    updateScaleUI();
    updateRotateUI();
    updateResetButtonVisibility();
    updateResetButtonPosition();
  }

  function setScale(nextScale) {
    state.scalePercent = clamp(Math.round(nextScale), 50, 200);
    applyTransform();
  }

  function adjustScale(delta) {
    setScale(state.scalePercent + delta);
  }

  function setRotation(nextRotation) {
    const normalized = ((nextRotation % 360) + 360) % 360;
    state.rotation = normalized;
    applyTransform();
  }

  function resetTransform() {
    state.scalePercent = 100;
    state.rotation = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    applyTransform();
  }

  function clearHideTimer() {
    if (!hideTimer) return;
    clearTimeout(hideTimer);
    hideTimer = 0;
  }

  function showPanel() {
    if (!refs.panel) return;
    clearHideTimer();
    updatePanelPosition();
    refs.panel.style.display = 'flex';
  }

  function scheduleHidePanel() {
    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      if (refs.panel) {
        refs.panel.style.display = 'none';
      }
    }, 180);
  }

  function onKeydown(event) {
    if (isEditableTarget(event.target)) return;
    if (!event.ctrlKey || event.metaKey || event.altKey) return;

    let handled = false;
    if (event.key === '+' || event.key === '=' || event.key === 'ArrowUp') {
      adjustScale(10);
      handled = true;
    } else if (event.key === '-' || event.key === '_' || event.key === 'ArrowDown') {
      adjustScale(-10);
      handled = true;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
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
    if (videoWrap) {
      videoWrap.classList.remove('nbs-dragging');
    }
    applyTransform();
  }

  function onMouseUp() {
    stopDragging();
  }

  function onVideoMouseDown(event) {
    if (event.button !== config.dragMouseButton) return;
    if (!event[config.dragModifierKey]) return;
    if (state.scalePercent <= 100) return;

    state.isDragging = true;
    state.dragStartX = event.clientX - state.offsetX;
    state.dragStartY = event.clientY - state.offsetY;

    if (videoWrap) {
      videoWrap.classList.add('nbs-dragging');
    }

    event.preventDefault();
  }

  function mountResetButton() {
    if (!videoWrap) return;
    if (refs.resetButton && refs.resetButton.isConnected) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nbs-reset-btn';
    button.textContent = '还原';
    button.addEventListener('click', () => {
      resetTransform();
    });
    videoWrap.appendChild(button);
    refs.resetButton = button;
    updateResetButtonPosition();
    updateResetButtonVisibility();
  }

  function bindVideoWrap() {
    const nextWrap = getVideoWrap();
    if (!nextWrap) return;
    if (nextWrap === videoWrap) return;

    if (videoWrap) {
      videoWrap.removeEventListener('mousedown', onVideoMouseDown);
      videoWrap.classList.remove('nbs-dragging');
    }

    if (refs.resetButton && refs.resetButton.isConnected) {
      refs.resetButton.remove();
    }
    refs.resetButton = null;

    videoWrap = nextWrap;
    videoWrap.addEventListener('mousedown', onVideoMouseDown);

    state.scalePercent = 100;
    state.rotation = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    state.isDragging = false;

    mountResetButton();
    applyTransform();
  }

  function mountControlPanel() {
    if (refs.root && refs.root.isConnected) {
      return;
    }

    const existing = document.getElementById('nbs-control-root');
    if (existing) {
      refs.root = existing;
      refs.toggleBtn = existing.querySelector('.nbs-toggle-btn');
      refs.panel = existing.querySelector('.nbs-panel');
      refs.scaleSlider = existing.querySelector('.nbs-scale-slider');
      refs.scaleValue = existing.querySelector('.nbs-scale-value');
      refs.rotateButtons = Array.from(existing.querySelectorAll('.nbs-rotate-btn'));
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
            <input class="nbs-scale-slider" type="range" min="50" max="200" step="1" value="100">
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
        </div>
        <div class="nbs-tip">拖拽移动：${config.dragModifierLabel} + 鼠标左键（仅缩放大于100%时生效）</div>
      </div>
    `;

    anchor.insertAdjacentElement('afterend', root);
    refs.root = root;
    refs.toggleBtn = root.querySelector('.nbs-toggle-btn');
    refs.panel = root.querySelector('.nbs-panel');
    refs.scaleSlider = root.querySelector('.nbs-scale-slider');
    refs.scaleValue = root.querySelector('.nbs-scale-value');
    refs.rotateButtons = Array.from(root.querySelectorAll('.nbs-rotate-btn'));

    refs.toggleBtn.addEventListener('mouseenter', showPanel);
    refs.toggleBtn.addEventListener('mouseleave', scheduleHidePanel);
    refs.panel.addEventListener('mouseenter', clearHideTimer);
    refs.panel.addEventListener('mouseleave', scheduleHidePanel);

    refs.scaleSlider.addEventListener('input', (event) => {
      setScale(Number(event.target.value));
    });

    refs.rotateButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const angle = Number(button.dataset.angle);
        setRotation(angle);
      });
    });

    updatePanelPosition();
    updateScaleUI();
    updateRotateUI();
  }

  function sync() {
    bindVideoWrap();
    mountResetButton();
    mountControlPanel();
    updatePanelPosition();
    updateResetButtonPosition();
    applyTransform();
  }

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = window.setTimeout(() => {
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
    window.addEventListener('resize', () => {
      updatePanelPosition();
      updateResetButtonPosition();
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
