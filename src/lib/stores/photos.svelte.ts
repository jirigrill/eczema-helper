import type { TrackingPhoto } from '$lib/domain/models';

type PhotoFilter = 'all' | 'skin' | 'stool';

let _photos = $state<TrackingPhoto[]>([]);
let _filter = $state<PhotoFilter>('all');

// Memoized derived value - only recomputes when _photos or _filter change
const _filtered = $derived(
  _filter === 'all' ? _photos : _photos.filter(p => p.photoType === _filter)
);

export const photosStore = {
  get photos() { return _photos; },
  get filter() { return _filter; },
  get filtered() { return _filtered; },
  setPhotos(photos: TrackingPhoto[]) { _photos = photos; },
  setFilter(filter: PhotoFilter) { _filter = filter; }
};
