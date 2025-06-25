import admin from 'firebase-admin';

admin.initializeApp();

export const firestore = admin.firestore();

firestore
  .listCollections()
  .then(() => {
    console.log('Pre-warming Firestore');
  })
  .catch((err) => {
    console.error('Pre-warming Firestore failed: ', err);
  });
