class Navi {

	constructor(header, menu) {

		this._header = header;
		this._menu = menu;

		this._on_back_requested = () => {};
		this._on_link_clicked = () => {};
		this._on_sort_key_clicked = () => {};
		this._on_filter_updated = () => {};

		this._setup_handlers();
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

	_setup_handlers() {

		let back_link = this._header.querySelector(".header-back-link");
		let menu_button = this._header.querySelector(".header-menu-button");
		let menu_content = this._menu.querySelector(".menu-content");
		let links = this._menu.querySelectorAll(".menu-navigation a");
		let sort_key_links = this._menu.querySelectorAll(".menu-sort-key");
		let filter_input = this._menu.querySelector(".menu-filter-input");

		back_link.addEventListener("click", (ev) => {
			ev.preventDefault();
			this._on_back_requested(ev.currentTarget.href);
		});
		menu_button.addEventListener("click", (ev) => {
			ev.preventDefault();
			this.open_menu();
		});
		this._menu.addEventListener("click", (ev) => {
			ev.preventDefault();
			if(!menu_content.contains(ev.target)) {
				this.close_menu();
			}
		});
		for(let l of links) {
			l.addEventListener("click", (ev) => {
				ev.preventDefault();
				this._on_link_clicked(ev.currentTarget.href);
				this.close_menu();
			});
		}
		for(let s of sort_key_links) {
			s.addEventListener("click", (ev) => {
				ev.preventDefault();
				this._on_sort_key_clicked(ev.currentTarget.dataset.key);
				this.close_menu();
			});
		}
		filter_input.addEventListener("change", (ev) => {
			console.log("change");
			this._on_filter_updated(ev.currentTarget.value);
			this.close_menu();
		});
	}

	update_title(prefix, name, suffix) {
		this._header.querySelector(".header-title-prefix").textContent = prefix;
		this._header.querySelector(".header-title-name").textContent = name;
		this._header.querySelector(".header-title-suffix").textContent = suffix;
	}

	update_back_link(link) {
		this._header.querySelector(".header-back-link").href = link;
	}

	open_menu() {
		this._menu.classList.add("expanded");
		this._menu.classList.add("interacted");
	}

	close_menu() {
		this._menu.classList.remove("expanded");
		this._menu.classList.add("interacted");
	}

	update_sort_key_link(key, link) {

		let sort_key_links = this._menu.querySelectorAll(".menu-sort-key");

		for(let s of sort_key_links) {
			if(s.dataset.key === key) {
				s.href = link;
			}
		}
	}

	update_filter_text(text) {
		this._menu.querySelector(".menu-filter-input").value = text;
	}
}

export { Navi }
