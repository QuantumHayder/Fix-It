"""Page inspection: open the page in a visible browser and collect every
interactive element into a list of plain dicts (later saved as JSON).

For each element we also build "locator candidates" (different ways to find
it with Playwright) and check each one on the live page:
  - match_count: how many elements the locator finds
  - matches_element: True if it finds exactly one element AND it is this one
"""
import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

# JavaScript that runs inside the page. It returns a list of element info.
# Each element also gets a temporary data-fixit-index attribute so we can
# check later that a locator points at the right element.
COLLECT_ELEMENTS_JS = r"""
() => {
  const SELECTOR = [
    'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary',
    '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
    '[role="tab"]', '[role="menuitem"]', '[role="switch"]', '[role="combobox"]',
    '[role="textbox"]', '[role="option"]', '[onclick]', '[contenteditable="true"]'
  ].join(', ');
  const MAX_ELEMENTS = 300;

  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 150);

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // Role written in the HTML, or the default role of the tag
  function getRole(el) {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit.trim().split(/\s+/)[0];
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return (el.multiple || el.size > 1) ? 'listbox' : 'combobox';
    if (tag === 'input') {
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'range') return 'slider';
      if (type === 'number') return 'spinbutton';
      if (type === 'search') return el.getAttribute('list') ? 'combobox' : 'searchbox';
      if (['text', 'email', 'tel', 'url'].includes(type)) return el.getAttribute('list') ? 'combobox' : 'textbox';
    }
    return null; // e.g. password or date inputs have no simple role
  }

  function getLabel(el) {
    if (el.labels && el.labels.length) {
      return clean(Array.from(el.labels).map(l => l.innerText).join(' '));
    }
    return '';
  }

  // A simple version of the "accessible name" (what a screen reader would say)
  function getName(el) {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return clean(ariaLabel);

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy.split(/\s+/)
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(n => n.innerText)
        .join(' ');
      if (clean(text)) return clean(text);
    }

    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'input' && ['button', 'submit', 'reset'].includes(type)) {
      return clean(el.value) || (type === 'submit' ? 'Submit' : type === 'reset' ? 'Reset' : '');
    }
    if (tag === 'input' && type === 'image') return clean(el.getAttribute('alt'));

    const label = getLabel(el);
    if (label) return label;

    if (['input', 'textarea', 'select'].includes(tag)) {
      return clean(el.getAttribute('title') || el.getAttribute('placeholder'));
    }
    const img = el.querySelector('img[alt]');
    return clean(el.innerText || (img && img.getAttribute('alt')) || el.getAttribute('title'));
  }

  function getAttributes(el) {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    // keep "value" only for buttons/checkboxes, never what a user typed into a field
    const keepValue = tag === 'button' ||
      (tag === 'input' && ['button', 'submit', 'reset', 'checkbox', 'radio'].includes(type));
    const out = {};
    for (const attr of el.attributes) {
      const n = attr.name;
      if (n === 'style' || n === 'data-fixit-index') continue;
      if (n.startsWith('on')) continue;          // inline JavaScript, not useful as data
      if (n === 'value' && !keepValue) continue;
      out[n] = attr.value.slice(0, 200);
    }
    return out;
  }

  function getForm(el) {
    const form = el.form || el.closest('form');
    if (!form) return null;
    // use getAttribute: form.id would return a child input named "id"
    return {
      id: form.getAttribute('id'),
      name: form.getAttribute('name'),
      action: form.getAttribute('action'),
      method: (form.getAttribute('method') || 'get').toLowerCase(),
    };
  }

  const results = [];
  for (const el of document.querySelectorAll(SELECTOR)) {
    if (results.length >= MAX_ELEMENTS) break;
    if (!isVisible(el)) continue;

    const index = results.length;
    el.setAttribute('data-fixit-index', String(index));
    const r = el.getBoundingClientRect();

    results.push({
      index: index,
      tag_name: el.tagName.toLowerCase(),
      html_id: el.getAttribute('id') || null,
      role: getRole(el),
      name: getName(el) || null,
      label: getLabel(el) || null,
      text: clean(el.innerText) || null,
      attributes: getAttributes(el),
      disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
      has_click_handler: el.hasAttribute('onclick'),
      form: getForm(el),
      bounding_box: {
        x: Math.round(r.x + window.scrollX),
        y: Math.round(r.y + window.scrollY),
        width: Math.round(r.width),
        height: Math.round(r.height),
      },
    });
  }
  return results;
}
"""


def _q(text: str) -> str:
    """Quote a string so it can be pasted into generated Python code."""
    return json.dumps(text)


def _is_simple_id(value: str) -> bool:
    # "#email" works as CSS, but ids like "user.name" or "1abc" would need escaping
    return value[:1].isalpha() and all(c.isalnum() or c in "-_" for c in value)


def build_locator_candidates(page, el: dict) -> list[dict]:
    attrs = el["attributes"]
    tag = el["tag_name"]
    candidates = []

    def add(strategy: str, code: str, locator):
        try:
            count = locator.count()
            matches = count == 1 and locator.get_attribute("data-fixit-index") == str(el["index"])
        except Exception:
            # e.g. an invalid role name or selector
            count, matches = 0, False
        candidates.append({
            "strategy": strategy,
            "code": code,
            "match_count": count,
            "unique": count == 1,
            "matches_element": matches,
            "recommended": False,
        })

    # Order = preference. User-facing locators first, CSS last.
    test_id = attrs.get("data-testid")
    if test_id:
        add("test_id", f"page.get_by_test_id({_q(test_id)})", page.get_by_test_id(test_id))

    if el["role"] and el["name"]:
        add(
            "role",
            f"page.get_by_role({_q(el['role'])}, name={_q(el['name'])}, exact=True)",
            page.get_by_role(el["role"], name=el["name"], exact=True),
        )

    if el["label"]:
        add("label", f"page.get_by_label({_q(el['label'])}, exact=True)",
            page.get_by_label(el["label"], exact=True))

    placeholder = attrs.get("placeholder")
    if placeholder:
        add("placeholder", f"page.get_by_placeholder({_q(placeholder)}, exact=True)",
            page.get_by_placeholder(placeholder, exact=True))

    if el["text"] and tag in ("a", "button"):
        add("text", f"page.get_by_text({_q(el['text'])}, exact=True)",
            page.get_by_text(el["text"], exact=True))

    html_id = el["html_id"]
    if html_id and _is_simple_id(html_id):
        css = f"#{html_id}"
        add("css_id", f"page.locator({_q(css)})", page.locator(css))

    name_attr = attrs.get("name")
    if name_attr and "'" not in name_attr:
        css = f"{tag}[name='{name_attr}']"
        add("css_name", f"page.locator({_q(css)})", page.locator(css))

    # recommend the first candidate that finds exactly this element
    for c in candidates:
        if c["matches_element"]:
            c["recommended"] = True
            break

    return candidates


def inspect_page(url: str, screenshot_path: Path, headless: bool = False,
                 timeout_ms: int = 30000) -> dict:
    allowed_host = urlparse(url).netloc.lower()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.set_default_timeout(5000)

            # Safety: the browser may only navigate to the website under test.
            # Images/scripts from other hosts (CDNs) are still allowed to load.
            def only_target_site(route):
                request = route.request
                try:
                    is_page_navigation = (
                        request.is_navigation_request() and request.frame == page.main_frame
                    )
                except Exception:
                    is_page_navigation = False
                if is_page_navigation and urlparse(request.url).netloc.lower() != allowed_host:
                    route.abort()
                else:
                    route.continue_()

            page.route("**/*", only_target_site)

            page.goto(url, wait_until="load", timeout=timeout_ms)
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except PlaywrightTimeoutError:
                pass  # some pages keep polling and never go idle, that's ok

            elements = page.evaluate(COLLECT_ELEMENTS_JS)
            for el in elements:
                el["locator_candidates"] = build_locator_candidates(page, el)

            page.screenshot(path=str(screenshot_path), full_page=True)

            return {
                "requested_url": url,
                "final_url": page.url,
                "page_title": page.title(),
                "element_count": len(elements),
                "elements": elements,
            }
        finally:
            browser.close()
