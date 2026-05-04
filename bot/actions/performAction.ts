import type { Page } from 'playwright'

/**
 * Perform an action on the page (e.g. build, roll, play card).
 */
async function performAction(page: Page, action: Record<string, unknown>): Promise<void> {
    void page
    void action
    // TODO: implement
}

export = performAction
