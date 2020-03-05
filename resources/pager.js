import { replace_img_src_if_needed, reset_img_src_if_incomplete } from "./imgsrc.js";
import { SinglePointerHandler } from "./pointer.js";
import { AnimationDebouncer } from "./animation.js";
import { get_friendly_size_text } from "./util.js";

class Pager {

	constructor(root, extra_pages) {

		this._root = root;
		this._back_link = "";
		this._active = false;

		this._pointer_handlers = [];
		this._extra_pages = extra_pages;
		this._current_num = null;
		this._resources = null;

		this._position = 0;
		this._toolbox_activated_at = null;
		this._rot_history = new Map();

		this._move_animation = new AnimationDebouncer((param) => {
			let container = this._root.querySelector(".pager-container");
			if(param.animation === true) {
				container.classList.add("animated");
			} else {
				container.classList.remove("animated");
			}
			container.style.transform = param.transform;
		});

		this._on_page_changed = () => {};
		this._on_back_requested = () => {};

		this._setup_extra_pages();
		this._move_to_base();
	}

	_setup_extra_pages() {

		let template = this._root.querySelector(".pager-page.template");
		let container = this._root.querySelector(".pager-container");

		for(let i = 0; i < this._extra_pages * 2 + 1; i += 1) {

			let v = template.cloneNode(true);
			let vi = v.querySelector(".pager-page-image");

			v.classList.remove("template");
			v.querySelector(".pager-page-back-link").addEventListener("click", (ev) => {
				ev.preventDefault();
				this._on_back_requested(ev.currentTarget.href);
			});
			v.querySelector(".pager-page-rot-button").addEventListener("click", (ev) => {
				let n = this._current_num;
				if(n === null) {
					return;
				}
				this._rot_history.set(n, (this._rot_history.get(n) || 0) + 1);
				this._redraw_pages();
			});
			for(let t of v.querySelectorAll(".toolbox")) {
				t.addEventListener("click", () => {
					this.show_toolbox();
				});
			}
			vi.addEventListener("load", () => { this._redraw_pages(); });
			vi.addEventListener("error", () => { this._redraw_pages(); });

			let h = new SinglePointerHandler(vi);
			h.on_pointer_moved = (dx, _) => {
				this._move_to(-dx);
			}
			h.on_pointer_completed = (dx, dy, rxy) => {

				let page = this._root.querySelector(".pager-page");
				let mov_threshold = page.clientWidth * 0.1;
				let tap_threshold = Math.min(page.clientWidth, page.clientHeight) * 0.05;

				let mov = 0;

				if(dx < -mov_threshold) {
					mov = +1;
				} else if(dx > mov_threshold) {
					mov = -1;
				}

				let next_num = (this._current_num !== null ? this._current_num + mov : null);
				let res_len = (this._resources !== null ? this._resources.length : -1);
				let in_range = (next_num >= 0 && next_num < res_len);

				if(next_num !== this._current_num && in_range) {
					this._on_page_changed(next_num);
				} else {
					this._move_to_base_animated();
				}

				if(rxy < tap_threshold) {
					this.toggle_toolbox();
				}
			};
			h.on_pointer_canceled = () => {
				this._move_to_base_animated();
			};

			this._pointer_handlers.push(h);

			container.appendChild(v);
		}

		container.removeChild(template);
	}

	set on_page_changed(fn) {
		this._on_page_changed = fn;
	}

	set on_back_requested(fn) {
		this._on_back_requested = fn;
	}

	_move_to(position, page_diff = 0, animation = false, queueing = false) {

		this._position = position;

		let trans_x_base = (this._extra_pages + page_diff) * -100;
		let trans_x = -position;

		let arg = {
			transform: `translateX(${trans_x_base}%) translateX(${trans_x}px)`,
			animation: animation,
		};

		if(queueing === true) {
			this._move_animation.push_after(arg);
		} else {
			this._move_animation.push(arg);
		}
	}

	_move_to_base_animated_after() {
		this._move_to(0, 0, true, true);
	}

	_move_to_base_animated() {
		this._move_to(0, 0, true);
	}

	_move_to_base() {
		this._move_to(0);
	}

	_rotate_to(elem, direction, animated = false) {

		let deg = direction * 90;
		let landscape = ((direction & 1) == 1);

		if(animated) {
			elem.classList.add("animated");
		} else {
			elem.classList.remove("animated");
		}
		if(landscape) {
			elem.classList.add("landscape");
		} else {
			elem.classList.remove("landscape");
		}

		elem.style.transform = `rotate(${deg}deg)`;
	}

	_redraw_single_page(elem, page_num, img_delayed, visible, rot_animated) {

		let img_elem = elem.querySelector(".pager-page-image");
		let name_elem = elem.querySelector(".pager-page-name");
		let size_elem = elem.querySelector(".pager-page-size");
		let download_link_elem = elem.querySelector(".pager-page-download-link");
		let tagger_elem = elem.querySelector(".tagger");

		if(visible) {
			elem.classList.add("visible");
		} else {
			elem.classList.remove("visible");
		}

		if(this._resources === null || page_num === null ||
			page_num < 0 || page_num >= this._resources.length) {

			elem.classList.add("blank-page");
			name_elem.textContent = "";
			size_elem.textContent = "";
			download_link_elem.href = "";
			tagger_elem.dataset.path = "";

			reset_img_src_if_incomplete(img_elem);

			return img_elem.complete;
		}

		let res = this._resources[page_num];

		elem.classList.remove("blank-page");
		name_elem.textContent = res.name;
		size_elem.textContent = get_friendly_size_text(res.size);
		download_link_elem.href = res.file_url;
		tagger_elem.dataset.path = res.path;

		img_elem.dataset.src = res.file_url;
		if(img_delayed === true) {
			img_elem.src = "";
		} else {
			replace_img_src_if_needed(img_elem);
		}

		let rot = this._rot_history.get(page_num) || 0;
		this._rotate_to(img_elem, rot, rot_animated);

		return img_elem.complete;
	}

	_redraw_pages(initial = false) {

		let pages = this._root.querySelectorAll(".pager-page");
		let cur_page = pages[this._extra_pages];

		let cur_ok = this._redraw_single_page(cur_page, this._current_num, false, true, !initial);

		for(let d = -this._extra_pages; d <= this._extra_pages; d += 1) {
			if(d === 0) {
				continue;
			}
			let v = pages[d + this._extra_pages];
			let p = (this._current_num !== null ? this._current_num + d : null);
			let near = !(d > 2 || d < -2);
			this._redraw_single_page(v, p, !cur_ok && initial, near, !initial);
		}
	}

	hide_toolbox() {
		let toolboxes = this._root.querySelectorAll(".pager-page .toolbox");
		for(let elem of toolboxes) {
			elem.classList.remove("active");
		}
		this._toolbox_activated_at = null;
	}

	show_toolbox() {

		this._toolbox_activated_at = Date.now();
		let toolboxes = this._root.querySelectorAll(".pager-page .toolbox");
		let timeout = 5000;

		for(let elem of toolboxes) {
			elem.classList.add("active");
		}

		let deactivation_fn = () => {
			if(this._toolbox_activated_at === null) {
				return;
			}
			if(this._toolbox_activated_at + timeout > Date.now()) {
				return;
			}
			this.hide_toolbox();
		};

		setTimeout(deactivation_fn, timeout);
	}

	toggle_toolbox() {
		if(this._toolbox_activated_at !== null) {
			this.hide_toolbox();
		} else {
			this.show_toolbox();
		}
	}

	change_page(page_num) {

		if(this._resources !== null) {
			page_num = Math.min(page_num, this._resources.length - 1);
		}
		page_num = Math.max(page_num, 0);

		let diff = this._current_num !== null ? (page_num - this._current_num) : null;
		this._current_num = page_num;

		let near = (diff !== null && Math.abs(diff) <= this._extra_pages);

		if(near) {

			let front_to_back = (diff >= 0);
			let container = this._root.querySelector(".pager-container");

			for(let i = 0; i < Math.abs(diff); i += 1) {
				if(front_to_back) {
					let v = container.firstElementChild;
					container.removeChild(v);
					container.appendChild(v);
				} else {
					let v = container.lastElementChild;
					container.removeChild(v);
					container.insertBefore(v, container.firstElementChild);
				}
			}

			this._move_to(this._position, -diff);
			this._move_to_base_animated_after();

		} else {

			this._move_to_base();
		}

		this._redraw_pages(!near);
	}

	activate() {
		if(this._active) {
			return;
		}
		this._active = true;
		this._root.classList.add("active");
		this._root.classList.add("interacted");
		this._redraw_pages(true);
	}

	deactivate() {
		if(!this._active) {
			return;
		}
		this._active = false;
		this._root.classList.remove("active");
		this._current_num = null;
		for(let img_elem of this._root.querySelectorAll(".pager-page-image")) {
			reset_img_src_if_incomplete(img_elem);
		}
	}

	update(resources) {

		/*
			resources := array({
				name: string,
				file_url: string,
				path: string,
			})
		*/

		this._resources = resources;
		this._current_num = null;
		this._redraw_pages(true);
		this._rot_history = new Map();
	}

	update_back_link(back_link) {
		this._back_link = back_link;
		for(let back_link_elem of this._root.querySelectorAll(".pager-page-back-link")) {
			back_link_elem.href = this._back_link;
		}
	}
}

export { Pager }
