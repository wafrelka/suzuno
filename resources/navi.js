class Navi {

	constructor(header, menu) {

		this._header = header;
		this._menu = menu;

		this._on_back_requested = () => {};

		this._setup_handlers();
	}

	set on_back_requested(fn) {
		this._on_back_requested = fn;
	}

	_setup_handlers() {

		let back_link = this._header.querySelector(".header-back-link");
		let menu_button = this._header.querySelector(".header-menu-button");
		let menu_content = this._menu.querySelector(".menu-content");

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

}

export { Navi }
