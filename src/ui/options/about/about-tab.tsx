import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';

import {AppVersion} from './version';

export function AboutTab(props: ViewProps): Malevic.Child {
    return <div class="settings-tab about-tab">
        <AppVersion />
        <div class="about-info">
            <p class="about-info__description">
                DarkReaderLocal is an offline fork of Dark Reader.
                All network calls have been removed for privacy and speed.
            </p>
            <p class="about-info__description">
                Engine: <strong>{props.data.settings.theme.engine}</strong>
            </p>
            <p class="about-info__description">
                Based on <a href="https://github.com/darkreader/darkreader" target="_blank" rel="noopener noreferrer">Dark Reader</a> (MIT License)
            </p>
        </div>
    </div>;
}
