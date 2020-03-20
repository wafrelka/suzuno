import { build_component } from "./component.js";
import { request_after_redraw } from "./animation.js";

class List {

	constructor(root_elem) {

		let click_fn = (ev) => {
			let link_class = "list-item-link";
			let target = ev.target;
			while(target != ev.currentTarget) {
				if(target.classList.contains(link_class)) {
					break;
				}
				target = target.parentElement;
			}
			if(!target.classList.contains(link_class)) {
				return;
			}
			ev.preventDefault();
			let type = target.dataset.type;
			let link = target.href;
			if(type == "file") {
				this._on_file_selected(link);
			} else if(type == "directory") {
				this._on_directory_selected(link);
			}
		};

		this._view = build_component(root_elem, {
			classes: ["active", "load-completed", "load-failed"],
			children: {
				loading_desc: { query: ".list-loading-description", },
				list: {
					query: ".list-container",
					handlers: { click: click_fn, },
					items: {
						classes: [
							"hidden-item", "highlighted",
							"dir-item", "file-item", "empty-item",
						],
						children: {
							thumbnail: { query: ".list-item-thumbnail", },
							name: { query: ".list-item-name", },
							link: { query: ".list-item-link", },
						},
					},
				},
			},
		});

		this._active = false;
		this._last_highlighted = null;
		this._visible = [];
		this._on_file_selected = () => {};
		this._on_directory_selected = () => {};

		let observer_options = {
			root: this._view.list.element,
			rootMargin: "100% 0% 100% 0%",
			threshold: 0,
		};
		let observer_callback = this._update_img_visibility.bind(this);
		this._observer = new IntersectionObserver(observer_callback, observer_options);

		this.reset();
	}

	set on_file_selected(fn) {
		this._on_file_selected = fn;
	}

	set on_directory_selected(fn) {
		this._on_directory_selected = fn;
	}

	_update_img_visibility(entries) {

		for(let entry of entries) {
			let target = entry.target;
			let visible = entry.isIntersecting;
			let index = this._view.list.find_index(target);
			let item = this._view.list.items[index];
			item.hidden_item = !visible;
			item.thumbnail.active = this._active && visible;
			this._visible[index] = visible;
		}
	}

	_set_active(active) {
		if(this._active === active) {
			return;
		}
		this._active = active;
		this._view.active = active;
		let items = this._view.list.items;
		for(let index = 0; index < items.length; index += 1) {
			items[index].thumbnail.active = active && this._visible[index];
		}
	}

	activate_thumbnails() {
		this._set_active(true);
	}

	deactivate_partial_thumbnails() {
		this._set_active(false);
	}

	set_error_message(text) {
		this._view.load_completed = false;
		this._view.load_failed = true;
		this._view.loading_desc.text = text;
	}

	reset() {
		this._view.load_completed = false;
		this._view.load_failed = false;
		this._view.loading_desc.text = "";
		for(let item of this._view.list.items) {
			item.thumbnail.active = false;
		}
	}

	reset_scroll() {
		if(this._last_highlighted !== null) {
			this._last_highlighted.highlighted = false;
			this._last_highlighted = null;
		}
		request_after_redraw(() => {
			this._view.list.element.scrollTo(0, 0);
		});
	}

	scroll_to(index) {

		let items = this._view.list.items;
		if(index < 0 || index >= items.length) {
			return;
		}
		let item = items[index];

		if(this._last_highlighted !== null) {
			this._last_highlighted.highlighted = false;
			this._last_highlighted = null;
		}

		request_after_redraw(() => {

			let elem = item.element;
			let item_height = elem.offsetHeight;
			let item_top = elem.offsetTop;
			let item_bottom = item_top + item_height;

			let container = this._view.list.element;
			let view_height = container.offsetHeight;
			let view_top = container.scrollTop;
			let view_bottom = view_top + view_height;

			let top_diff = view_top - item_top;
			let bottom_diff = item_bottom - view_bottom;
			let diff = 0;

			if(top_diff > 0) {
				diff = -(top_diff + item_height * 0.2);
			} else if(bottom_diff > 0) {
				diff = +(bottom_diff + item_height * 0.2);
			}
			container.scrollBy(0, diff);

			if(this._last_highlighted === null) {
				this._last_highlighted = this._view.list.items[index];
				this._last_highlighted.highlighted = true;
			}
		});
	}

	dump_scroll_state() {
		return this._view.list.element.scrollTop;
	}

	restore_scroll_state(state) {
		this._view.list.element.scrollTo(0, state);
	}

	update(resources) {

		/*
			resources := array({
				type: string ("file" | "directory" | "empty"),
				name: string,
				link: string,
				thumbnail_url: string,
			})
		*/

		this._view.load_completed = true;
		this._last_highlighted = null;

		this._observer.disconnect();
		this._view.list.resize(resources.length);
		this._visible = Array.from({ length: resources.length }, () => false);

		for(let i = 0; i < resources.length; i += 1) {

			let item = this._view.list.items[i];
			let res = resources[i];

			this._observer.observe(item.element);

			item.thumbnail.active = false;
			item.thumbnail.src = res.thumbnail_url || null;
			item.name.text = res.name;
			item.link.dataset.type = res.type;
			item.link.href = res.link || null;
			item.empty_item = (res.type != "file" && res.type != "directory");
			item.dir_item = (res.type == "directory");
			item.file_item = (res.type == "file");
			item.hidden_item = true;
			item.highlighted = false;
		}
	}
}

export { List }
