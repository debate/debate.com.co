import PocketBase from 'pocketbase';
import { PUBLIC_API } from '$env/static/public'

import { writable } from 'svelte/store';


// export const pb = new PocketBase(prodDatabase);
export const pb = new PocketBase(PUBLIC_API);

export const currentUser = writable(pb.authStore.model);

export const getImageURL = (collectionId: string, recordId: string, fileName:string) => {
    return `https://patient-tree-979.fly.dev/api/files/${collectionId}/${recordId}/${fileName}`
}

pb.authStore.onChange((auth) => {
    // console.log('Google auth token', auth)
    currentUser.set(pb.authStore.model);
})
