import fs  from 'fs-extra';

const sourceFolder = './dist'; // Replace with your source folder path
const destinationFolder = '../../build/directus-extension-eventticketing/dist'; // Replace with your destination folder path

// directus-extension-eventticketing

// Function to copy files from source to destination folder
function copyFiles() {
  fs.copy(sourceFolder, destinationFolder, (err) => {
    if (err) {
      console.error('Error copying files:', err);
    } else {
      console.log('Files copied successfully.');
    }
  });
}

copyFiles(); // Initial copy

// Watch for changes using nodemon
fs.watch(sourceFolder, { recursive: true }, (eventType, filename) => {
  if (eventType === 'change' || eventType === 'rename') {
    console.log(`File ${filename} has been ${eventType}d. Copying...`);
    copyFiles();
  }
});