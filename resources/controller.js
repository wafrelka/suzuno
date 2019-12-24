import {
	make_canonical_list_url,
	make_page_url,
	make_directory_url,
	make_list_url,
	make_parent_url,
	make_sorted_url,
	make_filtered_url,
	get_page,
	get_sort_key,
	get_filter_text,
	is_parent,
	is_parent_list,
	same_url,
} from "./path.js";
import { fetch_resources, fetch_resource_path } from "./resources.js";

function update_page_links(base_url, resources) {

	let file_count = 0;

	for(let res of resources) {
		if(res.type === "file") {
			res.link = make_page_url(base_url, file_count);
			file_count += 1;
		}
	}

	return resources;
}

function compute_processed_resources(resources, sort_key, filter) {

	let c = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
	let name_fn = (a, b) => (c.compare(a.name, b.name));
	let date_fn = (a, b) => (a.modified_at - b.modified_at);
	let rev = (f) => ((a, b) => (-f(a, b)));

	let comp_fn = new Map([
		["name_up", name_fn],
		["name_down", rev(name_fn)],
		["date_up", date_fn],
		["date_down", rev(date_fn)],
	]).get(sort_key) || name_fn;

	let processed = resources.sort(comp_fn);
	if(filter !== null) {
		processed = processed.filter((r) => r.name.includes(filter));
	}

	return processed;
}

function apply_or_null(f, x) {
	if(x !== null) {
		return f(x);
	}
	return null;
}

class Controller {

	constructor(list, navi, pager, tagger, bookmark_list) {

		this._list = list;
		this._navi = navi;
		this._pager = pager;
		this._tagger = tagger;
		this._bookmark_list = bookmark_list;

		this._on_push_state = () => {};

		this._history = new Map();
		this._current = {
			location: null,
			resources: null,
			processed: null,
			highlighted: null,
		};
		this._in_flight = null;

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
		};
		this._navi.on_sort_key_clicked = (key) => {
			this.refresh_with(make_sorted_url(this._current.location, key));
		};
		this._navi.on_filter_updated = (text) => {
			this.refresh_with(make_filtered_url(this._current.location, text));
		};
		this._pager.on_back_requested = (url) => {
			this.refresh_with(url);
		};
		this._pager.on_page_changed = (page_num) => {
			this.refresh_with(make_page_url(this._current.location, page_num));
		};
	}

	set on_push_state(fn) {
		this._on_push_state = fn;
	}

	async _issue_resource_fetching(location, controller) {

		try {
			let resp = await fetch_resources(location, this._bookmark_list, controller);
			this._update(undefined, { data: resp.resources, location: location });
		} catch(err) {
			if(err instanceof DOMException && err.name === "AbortError") {
				return;
			}
			this._list.set_error_message(`failed to load: ${err}`);
			console.log(err);
		}
	}

	_request_resources_update(location) {
		if(this._in_flight !== null) {
			this._in_flight.abort();
		}
		this._in_flight = new AbortController();
		this._issue_resource_fetching(location, this._in_flight);
	}

	_update(location_updated = undefined, resources_updated = undefined) {

		let prev = this._current;
		let cur = { ...prev };
		this._current = cur;

		if(location_updated !== undefined) {
			cur.location = new URL(location_updated);
		}
		if(resources_updated !== undefined) {
			let cur_list_url = make_canonical_list_url(cur.location);
			let res_list_url = make_canonical_list_url(resources_updated.location);
			if(!same_url(cur_list_url, res_list_url)) {
				return;
			}
			cur.resources = resources_updated.data;
			cur.processed = null;
		}

		let prev_list_url = apply_or_null(make_canonical_list_url, prev.location);
		let cur_list_url = make_canonical_list_url(cur.location);

		if(prev_list_url === null || !same_url(prev_list_url, cur_list_url)) {

			cur.resources = null;
			cur.processed = null;
			this._list.reset();
			this._request_resources_update(cur.location);
		}

		let prev_sort_key = apply_or_null(get_sort_key, prev.location);
		let cur_sort_key = get_sort_key(cur.location);
		let prev_filter = apply_or_null(get_filter_text, prev.location);
		let cur_filter = get_filter_text(cur.location);

		let changed = (prev_sort_key !== cur_sort_key || prev_filter !== cur_filter);

		if(resources_updated !== undefined || (cur.resources !== null && changed)) {

			cur.processed = compute_processed_resources(cur.resources, cur_sort_key, cur_filter);
			cur.processed = update_page_links(cur.location, cur.processed);

			let files = cur.processed.filter((r) => r.type == "file");
			this._list.update(cur.processed);
			this._list.reset_scroll();
			this._pager.update(files);
		}

		if(location_updated !== undefined) {
			if(prev.location !== null && is_parent(prev.location, cur.location)) {
				if(get_page(prev.location) !== null) {
					cur.highlighted = prev.location;
				} else {
					cur.highlighted = make_canonical_list_url(prev.location);
				}
			} else {
				cur.highlighted = null;
			}
			if(prev.location !== null && is_parent_list(cur.location, prev.location)) {
				let log = {
					scroll: this._list.dump_scroll_state(),
					location: new URL(prev.location),
				};
				this._history.set(prev_list_url.href, log);
			}
		}

		if(cur.resources !== null && cur.highlighted !== null) {
			let same_fn = (res) => res.link !== undefined && same_url(res.link, cur.highlighted);
			let idx = cur.processed.findIndex(same_fn);
			if(idx !== -1) {
				let log = this._history.get(cur_list_url.href);
				if(log !== undefined) {
					this._list.restore_scroll_state(log.scroll);
					this._history.delete(cur_list_url.href);
				}
				this._list.scroll_to(idx);
			}
		}

		let p = get_page(cur.location);

		if(p !== null) {
			if(cur.resources !== null) {
				this._pager.change_page(p);
			}
			this._pager.activate();
			this._list.deactivate_partial_thumbnails();
		} else {
			this._pager.deactivate();
			this._list.activate_thumbnails();
		}

		let suffix_items = [];

		if(cur_sort_key !== null) {
			suffix_items.push(`${cur_sort_key.replace("_", ":")}`);
		}
		if(cur_filter !== null) {
			suffix_items.push(`[${cur_filter}]`);
		}

		if(cur.resources !== null) {
			let c_all = cur.resources.length;
			let c_shown = cur.processed.length;
			if(c_all != c_shown) {
				suffix_items.push(`(${c_shown}/${c_all})`);
			} else {
				suffix_items.push(`(${c_all})`);
			}
		}

		let suffix = suffix_items.join(", ");
		let title = fetch_resource_path(cur.location, this._bookmark_list);
		this._navi.update_title("", title, suffix);

		let parent = make_parent_url(cur.location);
		let log = this._history.get(parent.href);
		if(log !== undefined) {
			parent = log.location;
		}
		this._navi.update_back_link(parent);

		for(let k of ["name_up", "name_down", "date_up", "date_down"]) {
			let u = make_sorted_url(cur.location, k);
			this._navi.update_sort_key_link(k, u);
		}
		this._navi.update_filter_text(cur_filter || "");
		this._pager.update_back_link(make_list_url(cur.location));

		this._navi.update_tag_list_path(title);
		this._tagger.redraw();
	}

	refresh_with(location, replacing = false) {
		this._update(location);
		this._on_push_state(location, null, replacing);
	}

	rewrite_with(location) {
		this._update(location);
	}

	get in_pager() {
		return apply_or_null(get_page, this._current.location) !== null;
	}

	get menu_expanded() {
		return this._navi.menu_expanded;
	}

	_move_page(diff) {
		if(this._current.resources === null) {
			return;
		}
		let p = apply_or_null(get_page, this._current.location);
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

	close_menu() {
		this._navi.close_menu();
	}

	move_to_parent() {
		let parent = make_parent_url(this._current.location);
		let log = this._history.get(parent.href);
		if(log !== undefined) {
			parent = log.location;
		}
		this.refresh_with(parent);
	}
}

export { Controller }
