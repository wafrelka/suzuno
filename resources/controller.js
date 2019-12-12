import {
	make_canonical_list_url,
	make_page_url,
	make_list_url,
	make_parent_url,
	get_page,
} from "./path.js";
import { append_links, fetch_resources, get_resource_title } from "./fetch.js";


class Controller {

	constructor(list, navi, pager) {

		this._list = list;
		this._navi = navi;
		this._pager = pager;
		this._in_pager = false;

		this._on_push_state = () => {};

		this._current = {
			location: null,
			resources: null,
		};

		this._list.on_file_selected = (url) => {
			this.refresh_with(url);
		};
		this._list.on_directory_selected = (url) => {
			this.refresh_with(url);
		};
		this._navi.on_back_requested = (url) => {
			this.refresh_with(url);
		};
		this._navi.on_link_clicked = (url) => {
			this.refresh_with(url);
		}
		this._pager.on_back_requested = (url) => {
			this.refresh_with(url);
		};
		this._pager.on_page_changed = (page_num) => {
			this.refresh_with(make_page_url(this._current.location, page_num));
		}
	}

	set on_push_state(fn) {
		this._on_push_state = fn;
	}

	async _request_resources_update(location) {
		try {
			let resp = await fetch_resources(location);
			this._update(undefined, resp.resources);
		} catch(err) {
			this._list.set_error_message(`failed to load: ${err}`);
		}
	}

	_update(location = undefined, resources = undefined) {

		let prev = this._current;
		this._current = {
			location: new URL(location === undefined ? prev.location : location),
			resources: resources === undefined ? prev.resources : resources,
		};

		let prev_list_url = (prev.location !== null ? make_canonical_list_url(prev.location) : null);
		let cur_list_url = make_canonical_list_url(this._current.location);

		if(prev_list_url === null || prev_list_url.pathname !== cur_list_url.pathname) {

			this._current.resources = null;
			this._list.reset();
			this._request_resources_update(this._current.location);

		}

		if(resources !== undefined) {

			let formatted = append_links(this._current.location, resources);
			let files = formatted.filter((r) => r.type == "file");

			this._list.update(formatted);
			this._pager.update(files);
		}

		let p = get_page(this._current.location);
		if(p !== null) {
			if(this._current.resources !== null) {
				this._pager.change_page(p);
			}
			this._pager.activate();
			this._list.deactivate_partial_thumbnails();
			this._in_pager = true;
		} else {
			this._pager.deactivate();
			this._list.activate_thumbnails();
			this._in_pager = false;
		}

		this._navi.update_back_link(make_parent_url(this._current.location));
		this._navi.update_title("", get_resource_title(this._current.location), "");
		this._pager.update_back_link(make_list_url(this._current.location));
	}

	refresh_with(location, replacing = false) {
		this._update(location);
		this._on_push_state(location, null, replacing);
	}

	rewrite_with(location) {
		this._update(location);
	}

	get in_pager() {
		return this._in_pager;
	}

	_move_page(diff) {
		if(this._current.resources === null) {
			return;
		}
		let p = pick_page(this._current.location);
		if(p !== null && p + diff >= 0 && p + diff < this._current.resources.length) {
			this.refresh_with(make_page_url(this._current.location, p + diff));
		}
	}

	move_to_next_page() {
		this._move_page(+1);
	}

	move_to_prev_page() {
		this._move_page(-1);
	}

	toggle_toolbox() {
		this._pager.toggle_toolbox();
	}

	switch_to_list() {
		this.refresh_with(make_list_url(this._current.location));
	}
}

export { Controller }
