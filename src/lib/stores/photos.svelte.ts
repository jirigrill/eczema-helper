import type { TrackingPhoto } from '$lib/domain/models';

let _photos = $state<TrackingPhoto[]>([]);
let _filter = $state<'all' | 'skin' | 'stool'>('all');

export const photosStore = {
  get photos() { return _photos; },
  get filter() { return _filter; },
  get filtered() {
    return _filter === 'all' ? _photos : _photos.filter(p => p.photoType === _filter);
  },
  setPhotos(photos: TrackingPhoto[]) { _photos = photos; },
  setFilter(filter: 'all' | 'skin' | 'stool') { _filter = filter; }
};
