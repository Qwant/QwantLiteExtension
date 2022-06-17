let previousURL = null;

const SETTINGS_KEY = "ext_set";
const KEYS = ['l', 'locale', 's', 'a', 'b', 'theme', 'ta']

const deleteEmpty = (obj) => {
    Object.keys(obj).forEach((key) => {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    });
    return obj;
};

const getParams = (url) => {
    const params = {};
    const urlParams = new URLSearchParams(
        url
            .replace("https://lite.qwant.com/", "")
            .replace("https://lite.qwant.com/settings", "")
    );
    const entries = urlParams.entries();

    for (const entry of entries) {
        params[entry[0]] = entry[1];
    }

    return deleteEmpty(params);
};

const saveSettings = (url) => {
    const settings = getParams(url);

    delete settings.q;
    delete settings["settings?"];
    delete settings["settings?q"];

    browser.storage.local.set({
        settings
    });

    return settings;
};

const getSearchQuery = async ({ url, ignoreQuery }) => {
    const { q, ...params } = getParams(url);
    const { settings } = await browser.storage.local.get("settings");

    if (!settings || Object.keys(settings).length === 0) {
        return null;
    }

    const result = {};
    Object.keys(settings).forEach((key) => {
        if (KEYS.includes(key.toLocaleLowerCase()) && settings[key]) {
            result[key] = settings[key];
        }
    });
    Object.keys(params).forEach((key) => {
        if (params[key]) {
            result[key] = params[key];
        }
    });

    const query = new URLSearchParams({
        q,
        ...result,
        [SETTINGS_KEY]: "1"
    });

    if (ignoreQuery) {
        query.delete('q')
    }

    return query.toString();
};

browser.webRequest.onBeforeRequest.addListener(
    async (info) => {
        if (info.method !== "GET" || info.type !== "main_frame") return;
        const queryParams = getParams(info.url);

        if (
            previousURL &&
            previousURL.startsWith("https://lite.qwant.com/settings")
        ) {
            // Save settings from URL parameters after redirect from "/settings"
            saveSettings(info.url);
        } else if (!!queryParams.q && !queryParams[SETTINGS_KEY]) {
            const searchParams = await getSearchQuery({ url: info.url, ignoreQuery: false });
            if (searchParams) {
                return {
                    redirectUrl: "https://lite.qwant.com/?" + searchParams
                };
            }
        } else if (info.url === 'https://lite.qwant.com' || info.url === 'https://lite.qwant.com/') {
            // Redirect on home-page to apply the theme
            const searchParams = await getSearchQuery({ url: info.url, ignoreQuery: true });
            if (searchParams) {
                return {
                    redirectUrl: "https://lite.qwant.com/?" + searchParams
                };
            }

        }
        previousURL = info.url;
        // Not sure if we should return here.
        // Seems like the safest return we can do.
        return { cancel: false };
    },
    {
        urls: ["https://lite.qwant.com/*"]
    },
    ["blocking"]
);

browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({
        "url": "https://lite.qwant.com"
    });
})