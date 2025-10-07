import os
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    This test verifies that clicking the 'Generate Example' button
    fetches and displays a sentence.
    """
    # Capture console messages
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    print("Starting verification script...")

    # 1. Arrange: Go to the application's homepage.
    print("Navigating to http://localhost:3000...")
    try:
        page.goto("http://localhost:3000", timeout=20000)
        print("Navigation complete.")
    except Exception as e:
        print(f"Error during navigation: {e}")
        return

    # 2. Act: Find the "Generate Example" button and click it.
    print("Looking for the 'Generate Example' button...")
    try:
        generate_button = page.get_by_role("button", name="✨ Generate Example")
        expect(generate_button).to_be_visible(timeout=10000)
        print("Button found. Clicking...")
        generate_button.click()
        print("Button clicked.")
    except Exception as e:
        print(f"Error clicking button: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        return

    # 3. Assert: Wait for the sentence to appear.
    print("Waiting for sentence to generate...")
    try:
        # We'll wait for the loading text to disappear first.
        expect(page.get_by_text("Generating...")).to_be_hidden(timeout=30000)
        print("Loading text is hidden.")

        # Now, we expect a sentence to be visible.
        sentence_container = page.locator(".whitespace-pre-wrap")
        expect(sentence_container).to_be_visible(timeout=30000)
        expect(sentence_container).not_to_be_empty(timeout=10000)
        print("Sentence container is visible and not empty.")

    except Exception as e:
        print(f"Error waiting for sentence: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        return

    # 4. Screenshot: Capture the final result for visual verification.
    screenshot_path = "jules-scratch/verification/verification.png"
    print(f"Taking screenshot and saving to {screenshot_path}...")
    page.screenshot(path=screenshot_path)
    print("Screenshot taken.")

    # Check if file exists
    if os.path.exists(screenshot_path):
        print("Screenshot file created successfully.")
    else:
        print("Error: Screenshot file was not created.")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    run_verification(page)
    browser.close()