import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {Button, ControlGroup} from '../../controls';

export function ReportBrokenSite(props: ViewProps): Malevic.Child {
    function openReport() {
        const url = props.data.activeTab?.url || '';
        const host = url ? new URL(url).hostname : 'example.com';
        const issueUrl = `https://github.com/darkreader/darkreader/issues/new?title=${encodeURIComponent(`[Dark Site] ${host}`)}&body=${encodeURIComponent(`**URL**: ${url}\n**Engine**: Dynamic\n**Description**: Dark mode not working correctly on this site.\n\n---\n_Reported from DarkReaderLocal_`)}`;
        window.open(issueUrl, '_blank');
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button onclick={openReport} class="advanced__report-broken-site-button">
                    Report Broken Site
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Open a pre-filled issue on Dark Reader's GitHub for sites with broken dark mode
            </ControlGroup.Description>
        </ControlGroup>
    );
}
