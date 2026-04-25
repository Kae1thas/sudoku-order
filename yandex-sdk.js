window.YandexStorage = (function () {
  const CLOUD_KEY = "sudoku_save_v1";

  let ysdk = null;
  let player = null;
  let initialized = false;
  let gameplayActive = false;

  function hasSdk() {
    return typeof window !== "undefined"
      && typeof window.YaGames !== "undefined"
      && typeof window.YaGames.init === "function";
  }

  async function init() {
    if (initialized) {
      return { ysdk, player, initialized: true };
    }

    if (!hasSdk()) {
      initialized = true;
      return { ysdk: null, player: null, initialized: true };
    }

    try {
      ysdk = await window.YaGames.init();

      try {
        player = await ysdk.getPlayer();
      } catch (err) {
        console.warn("Не удалось получить player:", err);
        player = null;
      }
    } catch (err) {
      console.warn("Не удалось инициализировать YaGames SDK:", err);
      ysdk = null;
      player = null;
    }

    initialized = true;
    return { ysdk, player, initialized: true };
  }

  async function ready() {
    await init();

    try {
      ysdk?.features?.LoadingAPI?.ready?.();
    } catch (err) {
      console.warn("Ошибка LoadingAPI.ready:", err);
    }
  }

  async function gameplayStart() {
    await init();

    if (gameplayActive) return;

    try {
      ysdk?.features?.GameplayAPI?.start?.();
      gameplayActive = true;
    } catch (err) {
      console.warn("Ошибка GameplayAPI.start:", err);
    }
  }

  async function gameplayStop() {
    await init();

    if (!gameplayActive) return;

    try {
      ysdk?.features?.GameplayAPI?.stop?.();
      gameplayActive = false;
    } catch (err) {
      console.warn("Ошибка GameplayAPI.stop:", err);
    }
  }

  async function bindPlatformPauseHandlers(onPause, onResume) {
    await init();

    if (!ysdk || typeof ysdk.on !== "function") {
      return false;
    }

    try {
      ysdk.on("game_api_pause", () => {
        try {
          onPause?.();
        } catch (err) {
          console.warn("Ошибка обработчика game_api_pause:", err);
        }
      });

      ysdk.on("game_api_resume", () => {
        try {
          onResume?.();
        } catch (err) {
          console.warn("Ошибка обработчика game_api_resume:", err);
        }
      });

      return true;
    } catch (err) {
      console.warn("Не удалось подписаться на события паузы Яндекс Игр:", err);
      return false;
    }
  }

  function getLanguage() {
    return ysdk?.environment?.i18n?.lang || "ru";
  }

  async function getCloudData() {
    await init();

    if (!player || typeof player.getData !== "function") {
      return null;
    }

    try {
      const data = await player.getData();
      return data && typeof data === "object" ? data : null;
    } catch (err) {
      console.warn("Ошибка чтения cloud data:", err);
      return null;
    }
  }

  async function setCloudData(data, flush = true) {
    await init();

    if (!player || typeof player.setData !== "function") {
      return false;
    }

    try {
      await player.setData(data, flush);
      return true;
    } catch (err) {
      console.warn("Ошибка записи cloud data:", err);
      return false;
    }
  }

  function getLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function setLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn("Ошибка записи localStorage:", err);
      return false;
    }
  }

  async function loadGameState(defaultState) {
    const cloud = await getCloudData();

    if (cloud && cloud[CLOUD_KEY]) {
      const data = cloud[CLOUD_KEY];

      if (data.coins !== undefined) {
        localStorage.setItem("sudoku_order_coins", String(data.coins));
      }

      if (data.progress !== undefined) {
        localStorage.setItem("sudoku_order_progress_v4", JSON.stringify(data.progress));
      }

      if (data.theme !== undefined) {
        localStorage.setItem("sudoku_theme", data.theme);
      }

      return {
        coins: data.coins ?? defaultState.coins,
        progress: data.progress ?? defaultState.progress,
        theme: data.theme ?? defaultState.theme,
      };
    }

    return defaultState;
  }

  async function saveGameState(state) {
    const payload = {
      [CLOUD_KEY]: {
        coins: state.coins,
        progress: state.progress,
        theme: state.theme,
      },
    };

    return setCloudData(payload, true);
  }

  async function openAuthDialog() {
    await init();

    if (!ysdk?.auth?.openAuthDialog) {
      return false;
    }

    try {
      await ysdk.auth.openAuthDialog();
      player = await ysdk.getPlayer();
      return true;
    } catch (err) {
      console.warn("Авторизация не выполнена:", err);
      return false;
    }
  }

  return {
    init,
    ready,
    gameplayStart,
    gameplayStop,
    bindPlatformPauseHandlers,
    getLanguage,
    getLocal,
    setLocal,
    loadGameState,
    saveGameState,
    openAuthDialog,
  };
})();
