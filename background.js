let previousURL = null;

const KEYS = ['l', 'locale', 's', 'a', 'b', 'theme', 'ta']

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}


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

const addRedirectRule = async (settings) => {
    const addOrReplaceParams = Object.entries(settings).map(([key, value]) => {
        return { key, value }
    })

    if (addOrReplaceParams == null) return

    const rules = await chrome.declarativeNetRequest.getDynamicRules()
    const ids = rules.map((rule) => rule.id)

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ids,
        addRules: [{
            id: getRandomInt(1, 255),
            priority: 1,
            action: {
                type: "redirect",
                redirect: {
                    transform: {
                        queryTransform: {
                            addOrReplaceParams
                        }
                    }
                }
            },
            condition: {
                urlFilter: "lite.qwant.com",
                resourceTypes: ["main_frame"]
            }
        }],
    }, () => { })
}

chrome.webRequest.onBeforeRequest.addListener(async (info) => {
    if (info.method !== "GET" || info.type !== "main_frame") return;
    if (
        previousURL &&
        previousURL.startsWith("https://lite.qwant.com/settings")
    ) {
        const settings = getParams(info.url);
        delete settings.q;
        delete settings["settings?"];
        delete settings["settings?q"];

        addRedirectRule(settings)
    }
    previousURL = info.url;

}, {
    urls: ["https://lite.qwant.com/*"]
})



