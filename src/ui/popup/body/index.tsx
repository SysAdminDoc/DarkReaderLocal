import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {isMobile} from '../../../utils/platform';
import {Overlay} from '../../controls';
import {openExtensionPage} from '../../utils';
import {toggleExtension} from '../components/header';
import MainPage from '../main-page';
import {Page, PageViewer} from '../page-viewer';
import ThemePage from '../theme/page';

interface IndexStore {
    activePage: PageId;
}

function Header(props: ViewProps) {
    return (
        <div class="rd-header">
            <img class="rd-header__icon" src="../../icons/dr_128.png" alt="" />
            <span class="rd-header__title">DarkReaderLocal</span>
            <span
                class={{'rd-header__power': true, 'rd-header__power--on': props.data.isEnabled}}
                onclick={() => toggleExtension(props, !props.data.isEnabled)}
            >
                {props.data.isEnabled ? 'on' : 'off'}
            </span>
            <span class="rd-header__gear" onclick={() => openExtensionPage('options')} title="Settings" />
        </div>
    );
}

type PageId = (
    'main'
    | 'theme'
    | 'settings'
    | 'site-list'
    | 'automation'
    | 'manage-settings'
);

let popstate: (() => void) | null = null;
isMobile && window.addEventListener('popstate', () => popstate && popstate(), {passive: true});

function Pages(props: ViewProps) {
    const context = getContext();
    const store: IndexStore = context.store;
    if (store.activePage == null) {
        store.activePage = 'main';
    }

    function onThemeNavClick() {
        isMobile && history.pushState(undefined, '');
        store.activePage = 'theme';
        context.refresh();
    }

    function onSettingsNavClick() {
        openExtensionPage('options');
    }

    function goBack() {
        const activePage = store.activePage;
        const settingsPageSubpages: PageId[] = ['automation', 'manage-settings', 'site-list'];
        if (settingsPageSubpages.includes(activePage)) {
            store.activePage = 'settings';
        } else {
            store.activePage = 'main';
        }
        context.refresh();
    }

    popstate = goBack;

    function onBackClick() {
        if (isMobile) {
            history.back();
        } else {
            goBack();
        }
    }

    return (
        <PageViewer
            activePage={store.activePage}
            onBackButtonClick={onBackClick}
        >
            <Page id="main">
                <MainPage
                    {...props}
                    onThemeNavClick={onThemeNavClick}
                    onSettingsNavClick={onSettingsNavClick}
                />
            </Page>
            <Page id="theme">
                <ThemePage {...props} />
            </Page>

        </PageViewer>
    );
}

export default function Body(props: ViewProps) {
    const context = getContext();
    context.onCreate(() => {
        if (isMobile) {
            window.addEventListener('contextmenu', ({preventDefault}) => preventDefault());
        }
    });
    context.onRemove(() => {
        document.documentElement.classList.remove('preview');
    });

    return (
        <body>
            <Header {...props} />
            <section class="m-section pages-section">
                <Pages {...props} />
            </section>
            <Overlay />
        </body>
    );
}
