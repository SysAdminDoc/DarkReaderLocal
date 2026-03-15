import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps, ConfigDiffResult, ConfigStatusData} from '../../../definitions';
import {Button, ControlGroup} from '../../controls';

const CONFIG_LABELS: Record<string, string> = {
    darkSites: 'Dark Sites',
    dynamicThemeFixes: 'Dynamic Theme Fixes',
    inversionFixes: 'Inversion Fixes',
    staticThemes: 'Static Themes',
    colorSchemes: 'Color Schemes',
    detectorHints: 'Detector Hints',
};

const ALL_KEYS = Object.keys(CONFIG_LABELS);

interface FetchStore {
    status: 'idle' | 'fetching' | 'success' | 'error' | 'loading';
    diffs: ConfigDiffResult[] | null;
    meta: ConfigStatusData | null;
    errorMessage: string | null;
}

function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) {
        return 'just now';
    }
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function FetchRemoteConfig(props: ViewProps): Malevic.Child {
    const context = getContext();
    const store = context.store as FetchStore;
    if (!store.status) {
        store.status = 'loading';
        store.diffs = null;
        store.meta = null;
        store.errorMessage = null;
        props.actions.getConfigStatus().then((meta) => {
            store.meta = meta;
            store.status = 'idle';
            context.refresh();
        });
    }

    async function fetchConfigs() {
        store.status = 'fetching';
        store.diffs = null;
        store.errorMessage = null;
        context.refresh();
        try {
            const diffs = await props.actions.fetchRemoteConfig();
            store.diffs = diffs;
            store.status = 'success';
            const meta = await props.actions.getConfigStatus();
            store.meta = meta;
        } catch (err: any) {
            store.status = 'error';
            store.errorMessage = err?.message || String(err) || 'Unknown error';
        }
        context.refresh();
    }

    async function toggleConfig(key: string) {
        if (!store.meta) {
            return;
        }
        const updated = {...store.meta.enabledConfigs, [key]: !store.meta.enabledConfigs[key]};
        store.meta.enabledConfigs = updated;
        context.refresh();
        await props.actions.setEnabledConfigs(updated);
    }

    const buttonLabel = store.status === 'fetching' ? 'Fetching...'
        : store.status === 'success' ? 'Updated!'
            : store.status === 'error' ? 'Fetch Failed'
                : 'Fetch Remote Rules';

    const disabled = store.status === 'fetching' || store.status === 'loading';

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <div class="fetch-remote">
                    <div class="fetch-remote__row">
                        <Button
                            onclick={disabled ? undefined : fetchConfigs}
                            class={{'fetch-remote__button': true, 'fetch-remote__button--disabled': disabled}}
                        >
                            {buttonLabel}
                        </Button>
                        {store.meta?.lastFetchedAt ? (
                            <span class="fetch-remote__timestamp">
                                Last fetched: {formatTimeAgo(store.meta.lastFetchedAt)}
                                {store.meta.fetchedTag ? ` (${store.meta.fetchedTag})` : ''}
                            </span>
                        ) : (
                            <span class="fetch-remote__timestamp">Never fetched</span>
                        )}
                    </div>

                    {store.status === 'error' && store.errorMessage ? (
                        <div class="fetch-remote__error">
                            {store.errorMessage}
                        </div>
                    ) : null}

                    {store.diffs && store.diffs.length > 0 ? (
                        <div class="fetch-remote__diffs">
                            <div class="fetch-remote__diffs-title">Changes Applied:</div>
                            {store.diffs.map((diff) => (
                                <div class="fetch-remote__diff-row">
                                    <span class="fetch-remote__diff-name">{CONFIG_LABELS[diff.key] || diff.key}</span>
                                    <span class="fetch-remote__diff-stats">
                                        {diff.addedLines > 0 ? <span class="fetch-remote__diff-add">+{diff.addedLines}</span> : null}
                                        {diff.removedLines > 0 ? <span class="fetch-remote__diff-rm">-{diff.removedLines}</span> : null}
                                        {diff.addedLines === 0 && diff.removedLines === 0 ? <span class="fetch-remote__diff-none">no changes</span> : null}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div class="fetch-remote__toggles">
                        <div class="fetch-remote__toggles-title">Config Sources:</div>
                        {ALL_KEYS.map((key) => {
                            const enabled = store.meta?.enabledConfigs?.[key] !== false;
                            const source = store.meta?.configSource?.[key] || 'local';
                            return (
                                <div class="fetch-remote__toggle-row" onclick={() => toggleConfig(key)}>
                                    <span class={{'fetch-remote__checkbox': true, 'fetch-remote__checkbox--on': enabled}}>
                                        {enabled ? '\u2713' : ''}
                                    </span>
                                    <span class="fetch-remote__toggle-label">{CONFIG_LABELS[key]}</span>
                                    <span class={{'fetch-remote__source-badge': true, [`fetch-remote__source-badge--${source}`]: true}}>
                                        {source}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Pull latest site fix rules from Dark Reader's repository. Toggle which configs to fetch remotely.
            </ControlGroup.Description>
        </ControlGroup>
    );
}
