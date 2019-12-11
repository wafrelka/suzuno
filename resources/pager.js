import { replace_img_src_if_needed, reset_img_src_if_incomplete } from "./imgsrc.js";
import { get_friendly_size_text } from "./util.js";

class Pager {

	constructor(root, extra_pages) {

		this._root = root;
		this._back_link = "";
		this._active = false;

		this._touch_number = 0;
		this._effective_touch = null;
		this._dragging = false;

		this._extra_pages = extra_pages;
		this._current_num = null;
		this._resources = null;

		this._position = 0;
		this._toolbox_activated_at = null;

		this._on_page_changed = () => {};
		this._on_back_requested = () => {};

		this._setup_extra_pages();
		this._move_to_base();
	}

	_setup_extra_pages() {

		let touch_handler = (fn, cancel) => ((ev) => {
			if(cancel === true) {
				ev.preventDefault();
			}
			for(const t of ev.changedTouches) {
				fn({x: t.pageX, y: t.pageY, id: t.identifier, target: ev.target});
			}
		});
		let mouse_handler = (fn) => ((ev) => {
			fn({x: ev.pageX, y: ev.pageY, id: "mouseevent", target: ev.target});
		});

		let touch_events = [
			["touchstart", this._handle_touch_start, false],
			["touchmove", this._handle_touch_move, false],
			["touchend", this._handle_touch_end, true],
			["touchcancel", this._handle_touch_cancel, true],
		];
		let mouse_events = [
			["mousedown", this._handle_touch_start],
			["mousemove", this._handle_touch_move],
			["mouseup", this._handle_touch_end],
			["mouseleave", this._handle_touch_cancel],
		];

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
			vi.addEventListener("load", () => { this._redraw_pages(); });
			vi.addEventListener("error", () => { this._redraw_pages(); });

			for(let te of touch_events) {
				vi.addEventListener(te[0], touch_handler(te[1].bind(this), te[2]));
			}
			for(let me of mouse_events) {
				vi.addEventListener(me[0], mouse_handler(me[1].bind(this)));
			}

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

	_handle_touch_start(touch) {

		this._touch_number += 1;

		if(this._touch_number === 1) {
			let t = {
				sx: touch.x, sy: touch.y,
				x: touch.x, y: touch.y,
				rx: 0, ry: 0,
				id: touch.id,
			};
			this._effective_touch = t;
		} else if(this._effective_touch !== null) {
			this._move_to_base_animated();
			this._effective_touch = null;
		}
	}

	_handle_touch_move(touch) {

		let eff = this._effective_touch;

		if(eff === null || eff.id != touch.id) {
			return;
		}

		eff.x = touch.x;
		eff.y = touch.y;
		eff.rx = Math.max(eff.rx, Math.abs(touch.x - eff.sx));
		eff.ry = Math.max(eff.ry, Math.abs(touch.y - eff.sy));
		let pos = eff.sx - eff.x;
		this._move_to(pos);
	}

	_handle_touch_end(touch) {

		this._touch_number = Math.max(this._touch_number - 1, 0);

		if(this._effective_touch === null || this._effective_touch.id != touch.id) {
			return;
		}

		let dx = this._effective_touch.x - this._effective_touch.sx;
		let rx = this._effective_touch.rx;
		let ry = this._effective_touch.ry;
		let rxy = Math.sqrt(rx * rx + ry * ry);

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

		this._effective_touch = null;
		return;
	}

	_handle_touch_cancel(touch) {

		this._touch_number = Math.max(this._touch_number - 1, 0);

		if(this._effective_touch === null || this._effective_touch.id != touch.id) {
			return;
		}

		this._move_to_base_animated();
		this._effective_touch = null;
	}

	_move_to(position, page_diff = 0, animation = false) {

		console.log("move_to(", position, ",", page_diff, ",", animation, ")");
		this._position = position;

		let trans_x_base = (this._extra_pages + page_diff) * -100;
		let trans_x = -position;

		let container = this._root.querySelector(".pager-container");
		if(animation) {
			container.classList.add("animated");
		} else {
			container.classList.remove("animated");
		}
		container.style.transform = `translateX(${trans_x_base}%) translateX(${trans_x}px)`;
	}

	_move_to_base_animated() {
		this._move_to(0, 0, true);
	}

	_move_to_base() {
		this._move_to(0);
	}

	_redraw_single_page(elem, page_num, delayed = false) {

		let img_elem = elem.querySelector(".pager-page-image");
		let name_elem = elem.querySelector(".pager-page-name");
		let size_elem = elem.querySelector(".pager-page-size");
		let download_link_elem = elem.querySelector(".pager-page-download-link");

		if(this._resources === null || page_num === null ||
			page_num < 0 || page_num >= this._resources.length) {

			elem.classList.add("blank-page");
			name_elem.textContent = "";
			size_elem.textContent = "";
			download_link_elem.href = "";

			reset_img_src_if_incomplete(img_elem);

			return img_elem.complete;
		}

		let res = this._resources[page_num];

		elem.classList.remove("blank-page");
		name_elem.textContent = res.name;
		size_elem.textContent = get_friendly_size_text(res.size);
		download_link_elem.href = res.file_url;

		img_elem.dataset.src = res.file_url;
		if(delayed === true) {
			reset_img_src_if_incomplete(img_elem);
		} else {
			replace_img_src_if_needed(img_elem);
		}

		return img_elem.complete;
	}

	_redraw_pages(current_priority = false) {

		let pages = this._root.querySelectorAll(".pager-page");
		let cur_page = pages[this._extra_pages];

		let cur_ok = this._redraw_single_page(cur_page, this._current_num);

		for(let d = -this._extra_pages; d <= this._extra_pages; d += 1) {
			if(d === 0) {
				continue;
			}
			let v = pages[d + this._extra_pages];
			let p = (this._current_num !== null ? this._current_num + d : null);
			this._redraw_single_page(v, p, !cur_ok && current_priority);
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

			window.requestAnimationFrame(() => {
				this._move_to(this._position, -diff);
				window.requestAnimationFrame(() => {
					this._move_to_base_animated();
				});
			});

		} else {

			this._move_to_base();
		}

		this._redraw_pages(!near);
	}

	activate() {
		this._active = true;
		this._root.classList.add("active");
		this._root.classList.add("interacted");
		this._redraw_pages(true);
	}

	deactivate() {
		this._active = false;
		this._root.classList.remove("active");
		this._current_num = null;
		for(let img_elem of this._root.querySelectorAll(".pager-page-image")) {
			reset_img_src_if_incomplete(img_elem);
		}
		this.hide_toolbox();
	}

	update(resources) {

		/*
			resources := array({
				name: string,
				file_url: string,
			})
		*/

		this._resources = resources;
		this._current_num = null;
		this._redraw_pages(true);
	}

	update_back_link(back_link) {
		this._back_link = back_link;
		for(let back_link_elem of this._root.querySelectorAll(".pager-page-back-link")) {
			back_link_elem.href = this._back_link;
		}
	}
}

export { Pager }
