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

const CONFIG_URLs = {
    darkSites: '../config/dark-sites.config',
    dynamicThemeFixes: '../config/dynamic-theme-fixes.config',
    inversionFixes: '../config/inversion-fixes.config',
    staticThemes: '../config/static-themes.config',
    colorSchemes: '../config/color-schemes.drconf',
    detectorHints: '../config/detector-hints.config',
};

interface LocalConfig {
    local: boolean;
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

    private static async loadColorSchemes(_config?: LocalConfig) {
        const $config = await readText({url: CONFIG_URLs.colorSchemes});
        ConfigManager.raw.colorSchemes = $config;
        ConfigManager.handleColorSchemes();
    }

    private static async loadDarkSites(_config?: LocalConfig) {
        const sites = await readText({url: CONFIG_URLs.darkSites});
        ConfigManager.raw.darkSites = sites;
        ConfigManager.handleDarkSites();
    }

    private static async loadDetectorHints(_config?: LocalConfig) {
        const $config = await readText({url: CONFIG_URLs.detectorHints});
        ConfigManager.raw.detectorHints = $config;
        ConfigManager.handleDetectorHints();
    }

    private static async loadDynamicThemeFixes(_config?: LocalConfig) {
        const fixes = await readText({url: CONFIG_URLs.dynamicThemeFixes});
        ConfigManager.raw.dynamicThemeFixes = fixes;
        ConfigManager.handleDynamicThemeFixes();
    }

    private static async loadInversionFixes(_config?: LocalConfig) {
        const fixes = await readText({url: CONFIG_URLs.inversionFixes});
        ConfigManager.raw.inversionFixes = fixes;
        ConfigManager.handleInversionFixes();
    }

    private static async loadStaticThemes(_config?: LocalConfig) {
        const themes = await readText({url: CONFIG_URLs.staticThemes});
        ConfigManager.raw.staticThemes = themes;
        ConfigManager.handleStaticThemes();
    }

    static async load(_config?: LocalConfig): Promise<void> {
        await Promise.all([
            ConfigManager.loadColorSchemes(),
            ConfigManager.loadDarkSites(),
            ConfigManager.loadDetectorHints(),
            ConfigManager.loadDynamicThemeFixes(),
            ConfigManager.loadInversionFixes(),
            ConfigManager.loadStaticThemes(),
        ]).catch((err) => console.error('Fatality', err));
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
