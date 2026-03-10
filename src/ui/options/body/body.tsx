import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {Overlay} from '../../controls';
import {AboutTab} from '../about/about-tab';
import {AdvancedTab} from '../advanced/advanced-tab';
import {AutomationTab} from '../automation/automation-tab';
import {GeneralTab} from '../general/general-tab';
import {HotkeysTab} from '../hotkeys/hotkeys-tab';
import {SiteListTab} from '../site-list/site-list-tab';

type BodyProps = ViewProps;

const NAV_SECTIONS = [
    {id: 'general', label: 'General', description: 'Defaults & display'},
    {id: 'site-list', label: 'Site List', description: 'Allowlist & blocklist'},
    {id: 'automation', label: 'Automation', description: 'Schedule & triggers'},
    {id: 'shortcuts', label: 'Shortcuts', description: 'Keyboard bindings'},
    {id: 'advanced', label: 'Advanced', description: 'Sync, import & tools'},
    {id: 'about', label: 'About', description: 'Version & legal'},
] as const;

type SectionId = typeof NAV_SECTIONS[number]['id'];

interface BodyStore {
    activeSection: SectionId;
}

export default function Body(props: BodyProps): Malevic.Child {
    let appVersion = '';
    try {
        appVersion = chrome.runtime.getManifest().version;
    } catch (_e) {
        // non-extension context
    }

    const context = getContext();
    const store = context.getStore<BodyStore>({activeSection: 'general'});

    function setSection(id: SectionId) {
        store.activeSection = id;
        context.refresh();
    }

    function renderContent(section: SectionId) {
        switch (section) {
            case 'general': return <GeneralTab {...props} />;
            case 'site-list': return <SiteListTab {...props} />;
            case 'automation': return <AutomationTab {...props} />;
            case 'shortcuts': return <HotkeysTab {...props} />;
            case 'advanced': return <AdvancedTab {...props} />;
            case 'about': return <AboutTab {...props} />;
        }
    }

    const activeNav = NAV_SECTIONS.find((s) => s.id === store.activeSection)!;

    return (
        <body>
            <aside class="os-sidebar">
                <div class="os-sidebar__brand">
                    <span class="os-sidebar__logo" />
                    <span class="os-sidebar__name">DarkReaderLocal</span>
                </div>
                <nav class="os-sidebar__nav">
                    {NAV_SECTIONS.map(({id, label, description}) => (
                        <span
                            class={{'os-nav-item': true, 'os-nav-item--active': store.activeSection === id}}
                            onclick={() => setSection(id)}
                        >
                            <span class="os-nav-item__label">{label}</span>
                            <span class="os-nav-item__desc">{description}</span>
                        </span>
                    ))}
                </nav>
                {appVersion ? (
                    <div class="os-sidebar__footer">
                        <span class="os-sidebar__version">v{appVersion}</span>
                    </div>
                ) : null}
            </aside>
            <main class="os-main">
                <div class="os-main__header">
                    <div class="os-main__title">{activeNav.label}</div>
                    <div class="os-main__subtitle">{activeNav.description}</div>
                </div>
                <div class={{'os-main__content': true, [`os-main__content--${store.activeSection}`]: true}}>
                    {renderContent(store.activeSection)}
                </div>
            </main>
            <Overlay />
        </body>
    );
}
