import PostHog from 'posthog-react-native';

let _client: PostHog | null = null;

export function initAnalytics(): void {
    const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    _client = new PostHog(key, { host: 'https://eu.i.posthog.com' });
}

export function track(event: string, props?: Record<string, string | number | boolean | null>): void {
    _client?.capture(event, props as any);
}
