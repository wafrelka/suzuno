import { build_component } from "./component.js";

class Navi {

	constructor(header, menu) {

		this._header_view = build_component(header, {
			children: {
				back_link: {
					query: ".header-back-link",
					handlers: {
						click: (ev) => {
							ev.preventDefault();
							this._on_back_requested(ev.currentTarget.href);
						},
					},
				},
				menu_button: {
					query: ".header-menu-button",
					handlers: {
						click: (ev) => {
							ev.preventDefault();
							this.open_menu();
						},
					},
				},
				title_prefix: { query: ".header-title-prefix" },
				title_suffix: { query: ".header-title-suffix" },
				title: { query: ".header-title-name" },
			},
		});
		this._menu_view = build_component(menu, {
			classes: ["expanded", "interacted"],
			children: {
				navi_links: {
					query: ".menu-navigation .menu-static-links",
					static_items: {
						query: "a",
						handlers: {
							click: (ev) => {
								ev.preventDefault();
								this._on_link_clicked(ev.currentTarget.href);
								this.close_menu();
							},
						},
					},
				},
				sort_keys: {
					query: ".menu-sort-keys",
					static_items: {
						query: ".menu-sort-key",
						handlers: {
							click: (ev) => {
								ev.preventDefault();
								this._on_sort_key_clicked(ev.currentTarget.dataset.key);
								this.close_menu();
							},
						},
					},
				},
				filter_input: {
					query: ".menu-filter-input",
					handlers: {
						change: (ev) => {
							this._on_filter_updated(ev.currentTarget.value);
							this.close_menu();
						},
					},
				},
				menu_content: { query: ".menu-content", },
				links: { query: ".menu-navigation" },
			},
			handlers: {
				click: (ev) => {
					if(this._menu_view.menu_content.element.contains(ev.target)) {
						return;
					}
					ev.preventDefault();
					this.close_menu();
				},
			},
		});

		this._expanded = false;

		this._on_back_requested = () => {};
		this._on_link_clicked = () => {};
		this._on_sort_key_clicked = () => {};
		this._on_filter_updated = () => {};
	}

	set on_back_requested(fn) {
		this._on_back_requested = fn;
	}

	set on_link_clicked(fn) {
		this._on_link_clicked = fn;
	}

	set on_sort_key_clicked(fn) {
		this._on_sort_key_clicked = fn;
	}

	set on_filter_updated(fn) {
		this._on_filter_updated = fn;
	}

	get menu_expanded() {
		return this._expanded;
	}

	update_title(prefix, name, suffix) {
		this._header_view.title_prefix.text = prefix;
		this._header_view.title.text = name;
		this._header_view.title_suffix.text = suffix;
	}

	update_back_link(link) {
		this._header_view.back_link.href = link;
	}

	open_menu() {
		this._expanded = true;
		this._menu_view.expanded = true;
		this._menu_view.interacted = true;
	}

	close_menu() {
		this._expanded = false;
		this._menu_view.expanded = false;
		this._menu_view.interacted = true;
	}

	update_sort_key_link(key, link) {
		for(let l of this._menu_view.sort_keys.static_items) {
			if(l.dataset.key === key) {
				l.href = link;
			}
		}
	}

	update_filter_text(text) {
		this._menu_view.filter_input.element.value = text;
	}
}

export { Navi }
