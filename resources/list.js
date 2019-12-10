import { replace_img_src_if_needed, reset_img_src_if_incomplete } from "./imgsrc.js";

class List {

	constructor(root) {

		this._root = root;
		this._active = true;
		this._on_file_selected = () => {};
		this._on_directory_selected = () => {};

		let observer_options = {
			root: this._root.querySelector(".list-container"),
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
		this._active = true;
		this._root.classList.add("active");
		for(let img_elem of this._root.querySelectorAll(".list-item-thumbnail")) {
			if(img_elem.dataset.state == "visible") {
				replace_img_src_if_needed(img_elem);
			}
		}
	}

	deactivate_partial_thumbnails() {
		this._active = false;
		this._root.classList.remove("active");
		for(let img_elem of this._root.querySelectorAll(".list-item-thumbnail")) {
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
		for(let img_elem of this._root.querySelectorAll(".list-item-thumbnail")) {
			img_elem.dataset.src = "";
			img_elem.src = "";
		}
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
			container.appendChild(v);
		}

		for(let i = 0; i < length; i += 1) {

			let item = resources[i];
			let v = container.children[i + 1]; // children[0] is the template

			this._observer.observe(v);

			for(let c of ["dir-item", "file-item", "empty-item", "template", "highlighted"]) {
				v.classList.remove(c);
			}

			let thumbnail_elem = v.querySelector(".list-item-thumbnail");
			let name_elem = v.querySelector(".list-item-name");
			let link_elem = v.querySelector(".list-item-link");

			thumbnail_elem.dataset.src = "";
			thumbnail_elem.src = "";
			name_elem.textContent = item.name;
			link_elem.dataset.type = item.type;
			link_elem.href = "";

			if("link" in item) {
				link_elem.href = item.link;
			}
			if("thumbnail_url" in item) {
				thumbnail_elem.dataset.src = item.thumbnail_url;
			}

			if(item.type == "file") {
				v.classList.add("file-item");
			} else if(item.type == "directory") {
				v.classList.add("dir-item");
			} else {
				v.classList.add("empty-item");
			}
			v.classList.add("hidden-item");
		}
	}
}

export { List }
