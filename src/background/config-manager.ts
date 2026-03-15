import {DEFAULT_COLORSCHEME} from '../defaults';
import {indexSitesFixesConfig} from '../generators/utils/parse';
import type {SiteFixesIndex} from '../generators/utils/parse';
import type {ParsedColorSchemeConfig} from '../utils/colorscheme-parser';
import {parseColorSchemeConfig} from '../utils/colorscheme-parser';
import {parseArray} from '../utils/text';
import {indexURLTemplateList, isURLInIndexedList} from '../utils/url';
import type {URLTemplateIndex} from '../utils/url';
import {logWarn} from './utils/log';
import {readText} from './utils/network';

const REMOTE_BRANCH = 'main';
const REMOTE_CONFIG_BASE = `https://raw.githubusercontent.com/darkreader/darkreader/${REMOTE_BRANCH}/src/config`;

const LOCAL_CONFIG_URLs = {
    darkSites: '../config/dark-sites.config',
    dynamicThemeFixes: '../config/dynamic-theme-fixes.config',
    inversionFixes: '../config/inversion-fixes.config',
    staticThemes: '../config/static-themes.config',
    colorSchemes: '../config/color-schemes.drconf',
    detectorHints: '../config/detector-hints.config',
};

const REMOTE_CONFIG_URLs = {
    darkSites: `${REMOTE_CONFIG_BASE}/dark-sites.config`,
    dynamicThemeFixes: `${REMOTE_CONFIG_BASE}/dynamic-theme-fixes.config`,
    inversionFixes: `${REMOTE_CONFIG_BASE}/inversion-fixes.config`,
    staticThemes: `${REMOTE_CONFIG_BASE}/static-themes.config`,
    colorSchemes: `${REMOTE_CONFIG_BASE}/color-schemes.drconf`,
    detectorHints: `${REMOTE_CONFIG_BASE}/detector-hints.config`,
};

const REMOTE_TIMEOUT = 10000;

const STORAGE_KEY_REMOTE_CONFIGS = 'remoteConfigs';
const STORAGE_KEY_CONFIG_META = 'remoteConfigMeta';

export type ConfigKey = keyof typeof LOCAL_CONFIG_URLs;
type StoredRemoteConfigs = Partial<Record<ConfigKey, string>>;

export interface ConfigMeta {
    lastFetchedAt: number | null;
    fetchedTag: string | null;
    configSource: Record<ConfigKey, 'local' | 'remote'>;
    enabledConfigs: Record<ConfigKey, boolean>;
}

const ALL_CONFIG_KEYS: ConfigKey[] = ['darkSites', 'dynamicThemeFixes', 'inversionFixes', 'staticThemes', 'colorSchemes', 'detectorHints'];

const DEFAULT_META: ConfigMeta = {
    lastFetchedAt: null,
    fetchedTag: null,
    configSource: {
        darkSites: 'local',
        dynamicThemeFixes: 'local',
        inversionFixes: 'local',
        staticThemes: 'local',
        colorSchemes: 'local',
        detectorHints: 'local',
    },
    enabledConfigs: {
        darkSites: true,
        dynamicThemeFixes: true,
        inversionFixes: true,
        staticThemes: true,
        colorSchemes: true,
        detectorHints: true,
    },
};

export interface ConfigDiff {
    key: ConfigKey;
    localLines: number;
    remoteLines: number;
    addedLines: number;
    removedLines: number;
}

async function getStoredData(): Promise<{configs: StoredRemoteConfigs; meta: ConfigMeta}> {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_REMOTE_CONFIGS, STORAGE_KEY_CONFIG_META], (result) => {
            resolve({
                configs: result[STORAGE_KEY_REMOTE_CONFIGS] || {},
                meta: {...DEFAULT_META, ...(result[STORAGE_KEY_CONFIG_META] as Partial<ConfigMeta> || {})},
            });
        });
    });
}

async function storeData(configs: StoredRemoteConfigs, meta: ConfigMeta): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set({
            [STORAGE_KEY_REMOTE_CONFIGS]: configs,
            [STORAGE_KEY_CONFIG_META]: meta,
        }, resolve);
    });
}

async function fetchAllRemoteConfigs(enabledConfigs: Record<ConfigKey, boolean>): Promise<StoredRemoteConfigs> {
    const results: StoredRemoteConfigs = {};
    await Promise.all(ALL_CONFIG_KEYS.map(async (key) => {
        if (!enabledConfigs[key]) {
            return;
        }
        try {
            results[key] = await readText({url: REMOTE_CONFIG_URLs[key], timeout: REMOTE_TIMEOUT});
        } catch (err) {
            logWarn(`Remote config fetch failed for ${key}`, err);
        }
    }));
    return results;
}

function computeDiff(oldText: string, newText: string): {addedLines: number; removedLines: number} {
    const oldLines = new Set(oldText.split('\n'));
    const newLines = new Set(newText.split('\n'));
    let addedLines = 0;
    let removedLines = 0;
    newLines.forEach((line) => {
        if (!oldLines.has(line)) {
            addedLines++;
        }
    });
    oldLines.forEach((line) => {
        if (!newLines.has(line)) {
            removedLines++;
        }
    });
    return {addedLines, removedLines};
}

async function readConfig(key: ConfigKey, cachedConfigs: StoredRemoteConfigs): Promise<string> {
    if (cachedConfigs[key]) {
        return cachedConfigs[key]!;
    }
    return await readText({url: LOCAL_CONFIG_URLs[key]});
}

export default class ConfigManager {
    private static DARK_SITES_INDEX: URLTemplateIndex | null;
    static DETECTOR_HINTS_INDEX: SiteFixesIndex | null;
    static DETECTOR_HINTS_RAW: string | null;
    static DYNAMIC_THEME_FIXES_INDEX: SiteFixesIndex | null;
    static DYNAMIC_THEME_FIXES_RAW: string | null;
    static INVERSION_FIXES_INDEX: SiteFixesIndex | null;
    static INVERSION_FIXES_RAW: string | null;
    static STATIC_THEMES_INDEX: SiteFixesIndex | null;
    static STATIC_THEMES_RAW: string | null;
    static COLOR_SCHEMES_RAW: ParsedColorSchemeConfig | null;

    static raw = {
        darkSites: null as string | null,
        detectorHints: null as string | null,
        dynamicThemeFixes: null as string | null,
        inversionFixes: null as string | null,
        staticThemes: null as string | null,
        colorSchemes: null as string | null,
    };

    static overrides = {
        darkSites: null as string | null,
        detectorHints: null as string | null,
        dynamicThemeFixes: null as string | null,
        inversionFixes: null as string | null,
        staticThemes: null as string | null,
    };

    static async load(): Promise<void> {
        let {configs, meta} = await getStoredData();

        if (!meta.lastFetchedAt) {
            const remoteConfigs = await fetchAllRemoteConfigs(meta.enabledConfigs);
            if (Object.keys(remoteConfigs).length > 0) {
                meta.lastFetchedAt = Date.now();
                meta.fetchedTag = REMOTE_BRANCH;
                ALL_CONFIG_KEYS.forEach((key) => {
                    if (remoteConfigs[key]) {
                        meta.configSource[key] = 'remote';
                    }
                });
                await storeData(remoteConfigs, meta);
                configs = remoteConfigs;
            }
        }

        await Promise.all([
            ConfigManager.loadColorSchemes(configs),
            ConfigManager.loadDarkSites(configs),
            ConfigManager.loadDetectorHints(configs),
            ConfigManager.loadDynamicThemeFixes(configs),
            ConfigManager.loadInversionFixes(configs),
            ConfigManager.loadStaticThemes(configs),
        ]).catch((err) => console.error('Fatality', err));
    }

    static async fetchRemoteConfigs(): Promise<ConfigDiff[]> {
        const {configs: oldConfigs, meta} = await getStoredData();
        const remoteConfigs = await fetchAllRemoteConfigs(meta.enabledConfigs);
        if (Object.keys(remoteConfigs).length === 0) {
            throw new Error('Failed to fetch any remote configs');
        }

        const diffs: ConfigDiff[] = [];
        ALL_CONFIG_KEYS.forEach((key) => {
            if (!remoteConfigs[key]) {
                return;
            }
            const oldText = oldConfigs[key] || ConfigManager.raw[key] || '';
            const newText = remoteConfigs[key]!;
            const {addedLines, removedLines} = computeDiff(oldText, newText);
            diffs.push({
                key,
                localLines: oldText.split('\n').length,
                remoteLines: newText.split('\n').length,
                addedLines,
                removedLines,
            });
        });

        const mergedConfigs = {...oldConfigs, ...remoteConfigs};
        meta.lastFetchedAt = Date.now();
        meta.fetchedTag = REMOTE_BRANCH;
        ALL_CONFIG_KEYS.forEach((key) => {
            if (remoteConfigs[key]) {
                meta.configSource[key] = 'remote';
            }
        });
        await storeData(mergedConfigs, meta);

        ALL_CONFIG_KEYS.forEach((key) => {
            if (remoteConfigs[key] && key in ConfigManager.raw) {
                (ConfigManager.raw as any)[key] = remoteConfigs[key];
            }
        });

        ConfigManager.handleColorSchemes();
        ConfigManager.handleDarkSites();
        ConfigManager.handleDetectorHints();
        ConfigManager.handleDynamicThemeFixes();
        ConfigManager.handleInversionFixes();
        ConfigManager.handleStaticThemes();

        return diffs;
    }

    static async getConfigStatus(): Promise<ConfigMeta> {
        const {meta} = await getStoredData();
        return meta;
    }

    static async setEnabledConfigs(enabledConfigs: Record<ConfigKey, boolean>): Promise<void> {
        const {configs, meta} = await getStoredData();
        meta.enabledConfigs = enabledConfigs;
        await storeData(configs, meta);
    }

    private static async loadColorSchemes(configs: StoredRemoteConfigs) {
        ConfigManager.raw.colorSchemes = await readConfig('colorSchemes', configs);
        ConfigManager.handleColorSchemes();
    }

    private static async loadDarkSites(configs: StoredRemoteConfigs) {
        ConfigManager.raw.darkSites = await readConfig('darkSites', configs);
        ConfigManager.handleDarkSites();
    }

    private static async loadDetectorHints(configs: StoredRemoteConfigs) {
        ConfigManager.raw.detectorHints = await readConfig('detectorHints', configs);
        ConfigManager.handleDetectorHints();
    }

    private static async loadDynamicThemeFixes(configs: StoredRemoteConfigs) {
        ConfigManager.raw.dynamicThemeFixes = await readConfig('dynamicThemeFixes', configs);
        ConfigManager.handleDynamicThemeFixes();
    }

    private static async loadInversionFixes(configs: StoredRemoteConfigs) {
        ConfigManager.raw.inversionFixes = await readConfig('inversionFixes', configs);
        ConfigManager.handleInversionFixes();
    }

    private static async loadStaticThemes(configs: StoredRemoteConfigs) {
        ConfigManager.raw.staticThemes = await readConfig('staticThemes', configs);
        ConfigManager.handleStaticThemes();
    }

    private static handleColorSchemes(): void {
        const $config = ConfigManager.raw.colorSchemes;
        const {result, error} = parseColorSchemeConfig($config || '');
        if (error) {
            logWarn(`Color Schemes parse error, defaulting to fallback. ${error}.`);
            ConfigManager.COLOR_SCHEMES_RAW = DEFAULT_COLORSCHEME;
            return;
        }
        ConfigManager.COLOR_SCHEMES_RAW = result;
    }

    private static handleDarkSites(): void {
        const $sites = ConfigManager.overrides.darkSites || ConfigManager.raw.darkSites;
        const templates = parseArray($sites!);
        ConfigManager.DARK_SITES_INDEX = indexURLTemplateList(templates);
    }

    private static handleDetectorHints(): void {
        const $hints = ConfigManager.overrides.detectorHints || ConfigManager.raw.detectorHints || '';
        ConfigManager.DETECTOR_HINTS_INDEX = indexSitesFixesConfig($hints);
        ConfigManager.DETECTOR_HINTS_RAW = $hints;
    }

    static handleDynamicThemeFixes(): void {
        const $fixes = ConfigManager.overrides.dynamicThemeFixes || ConfigManager.raw.dynamicThemeFixes || '';
        ConfigManager.DYNAMIC_THEME_FIXES_INDEX = indexSitesFixesConfig($fixes);
        ConfigManager.DYNAMIC_THEME_FIXES_RAW = $fixes;
    }

    static handleInversionFixes(): void {
        const $fixes = ConfigManager.overrides.inversionFixes || ConfigManager.raw.inversionFixes || '';
        ConfigManager.INVERSION_FIXES_INDEX = indexSitesFixesConfig($fixes);
        ConfigManager.INVERSION_FIXES_RAW = $fixes;
    }

    static handleStaticThemes(): void {
        const $themes = ConfigManager.overrides.staticThemes || ConfigManager.raw.staticThemes || '';
        ConfigManager.STATIC_THEMES_INDEX = indexSitesFixesConfig($themes);
        ConfigManager.STATIC_THEMES_RAW = $themes;
    }

    static isURLInDarkList(url: string): boolean {
        if (!ConfigManager.DARK_SITES_INDEX) {
            return false;
        }
        return isURLInIndexedList(url, ConfigManager.DARK_SITES_INDEX);
    }
}
