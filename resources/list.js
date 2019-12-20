import { replace_img_src_if_needed, reset_img_src_if_incomplete } from "./imgsrc.js";
import { request_after_redraw } from "./animation.js";

class List {

	constructor(root) {

		this._root = root;
		this._active = false;
		this._on_file_selected = () => {};
		this._on_directory_selected = () => {};

		let observer_options = {
			root: this._root.querySelector(".list-container"),
			rootMargin: "100% 0% 100% 0%",
			threshold: 0,
		};
		let observer_callback = this._update_img_visibility.bind(this);
		this._observer = new IntersectionObserver(observer_callback, observer_options);

		this._last_highlighted = null;

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
			let img_elem = target.querySelector(".list-item-thumbnail");

			let visible = entry.isIntersecting;
			img_elem.dataset.state = (visible ? "visible" : "hidden");

			if(visible) {
				target.classList.remove("hidden-item");
			} else {
				target.classList.add("hidden-item");
			}

			if(visible && this._active && img_elem.dataset.src !== "") {
				replace_img_src_if_needed(img_elem);
			} else {
				reset_img_src_if_incomplete(img_elem);
			}
		}
	}

	activate_thumbnails() {
		if(this._active) {
			return;
		}
		this._active = true;
		this._root.classList.add("active");
		let visible_elems = this._root.querySelectorAll(".list-item-thumbnail[data-state=\"visible\"]");
		for(let img_elem of visible_elems) {
			replace_img_src_if_needed(img_elem);
		}
	}

	deactivate_partial_thumbnails() {
		if(!this._active) {
			return;
		}
		this._active = false;
		this._root.classList.remove("active");
		let visible_elems = this._root.querySelectorAll(".list-item-thumbnail[data-state=\"visible\"]");
		for(let img_elem of visible_elems) {
			reset_img_src_if_incomplete(img_elem);
		}
	}

	set_error_message(text) {
		this._root.classList.remove("load-completed");
		this._root.classList.add("load-failed");
		this._root.querySelector(".list-loading-description").textContent = text;
	}

	reset() {
		this._root.classList.remove("load-completed");
		this._root.classList.remove("load-failed");
		this._root.querySelector(".list-loading-description").textContent = "";
		let visible_elems = this._root.querySelectorAll(".list-item-thumbnail[data-state=\"visible\"]");
		for(let img_elem of visible_elems) {
			img_elem.dataset.src = "";
			img_elem.src = "";
		}
	}

	reset_scroll() {

		let container = this._root.querySelector(".list-container");

		if(this._last_highlighted !== null) {
			this._last_highlighted.classList.remove("highlighted");
			this._last_highlighted = null;
		}
		request_after_redraw(() => { container.scrollTo(0, 0); });
	}

	scroll_to(index) {

		let container = this._root.querySelector(".list-container");
		let items = container.children; // items[0] is the template element
		if(index < 0 || index >= items.length - 1) {
			return;
		}
		let item = items[index + 1];

		if(this._last_highlighted !== null) {
			this._last_highlighted.classList.remove("highlighted");
			this._last_highlighted = null;
		}

		request_after_redraw(() => {

			let item_height = item.offsetHeight;
			let item_top = item.offsetTop;
			let item_bottom = item_top + item_height;

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
				this._last_highlighted = item;
				item.classList.add("highlighted");
			}
		});
	}

	dump_scroll_state() {
		return this._root.querySelector(".list-container").scrollTop;
	}

	restore_scroll_state(state) {
		this._root.querySelector(".list-container").scrollTo(0, state);
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

		this._root.classList.add("load-completed");

		let template = this._root.querySelector(".template");
		let container = this._root.querySelector(".list-container");
		let length = resources.length;

		let click_fn = (ev) => {
			ev.preventDefault();
			let target = ev.currentTarget;
			let type = target.dataset.type;
			let link = target.href;
			if(type == "file") {
				this._on_file_selected(link);
			} else if(type == "directory") {
				this._on_directory_selected(link);
			}
		};

		this._observer.disconnect();

		for(let i = container.children.length - 1; i > length; i -= 1) {
			container.removeChild(container.lastElementChild);
		}
		for(let i = container.children.length - 1; i < length; i += 1) {
			let v = template.cloneNode(true);
			v.querySelector(".list-item-link").addEventListener("click", click_fn);
			v.classList.remove("template");
			container.appendChild(v);
		}
		let children = Array.from(container.children);

		for(let i = 0; i < length; i += 1) {

			let item = resources[i];
			let v = children[i + 1]; // children[0] is the template

			this._observer.observe(v);

			let thumbnail_elem = v.querySelector(".list-item-thumbnail");
			let name_elem = v.querySelector(".list-item-name");
			let link_elem = v.querySelector(".list-item-link");

			thumbnail_elem.dataset.src = "";
			reset_img_src_if_incomplete(thumbnail_elem);
			name_elem.textContent = item.name;
			link_elem.dataset.type = item.type;
			link_elem.href = "";

			if("link" in item) {
				link_elem.href = item.link;
			}
			if("thumbnail_url" in item) {
				thumbnail_elem.dataset.src = item.thumbnail_url;
			}

			let type_class = "empty-item";
			if(item.type == "file") {
				type_class = "file-item";
			} else if(item.type == "directory") {
				type_class = "dir-item";
			}

			for(let c of ["dir-item", "file-item", "empty-item"]) {
				if(c !== type_class) {
					v.classList.remove(c);
				}
			}
			v.classList.add(type_class);
			v.classList.add("hidden-item");
		}
	}
}

export { List }
