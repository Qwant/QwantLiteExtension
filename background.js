
let previousURL = null

const deleteEmpty = (obj) => {
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    });
    return obj
}


const getParams = (url) => {
    const params = {
        a: undefined,
        b: undefined,
        l: undefined,
        locale: undefined,
        q: undefined,
        s: undefined,
        ta: undefined,
        theme: undefined,
    }

    const urlParams = new URLSearchParams(url.replace('https://lite.qwant.com/', '').replace('https://lite.qwant.com/settings', ''));
    const entries = urlParams.entries();

    for (const entry of entries) {
        params[entry[0]] = entry[1]
    }

    return deleteEmpty(params)
}

const isSearchQuery = ({ method, type, url }) => {
    if (method !== "GET" || type !== "main_frame") return false
    return !!getParams(url).q
}

const saveSettings = (url) => {
    const settings = getParams(url)

    delete settings.q
    delete settings['settings?']
    delete settings['settings?q']

    browser.storage.local.set({ settings })
    return settings
}

const getSearchQuery = async (url) => {
    const { q, ...params } = getParams(url)
    const result = {}

    const { settings } = await browser.storage.local.get("settings")

    if (!settings || Object.keys(settings).length === 0) { return null }

    Object.keys(settings).forEach(key => {
        result[key] = settings[key]
    })

    Object.keys(params).forEach(key => {
        result[key] = params[key]
    })

    const query = new URLSearchParams({
        q,
        ...result,
        qlite_settings: "1"
    }).toString()

    return query
}

browser.webRequest.onBeforeRequest.addListener(
    async (info) => {
        if (info.method !== "GET" || info.type !== "main_frame") return

        const queryParams = getParams(info.url)

        // User save new settings
        if (previousURL && previousURL.startsWith('https://lite.qwant.com/settings')) {
            saveSettings(info.url)
        } else if (isSearchQuery(info)) {
            if (!queryParams.qlite_settings) {
                const searchParams = await getSearchQuery(info.url)
                if (searchParams) {
                    return {
                        redirectUrl: "https://lite.qwant.com/?" + searchParams
                    }
                }
            }
        }

        previousURL = info.url
    },
    { urls: ["https://lite.qwant.com/*"] },
    ["blocking"]
);
