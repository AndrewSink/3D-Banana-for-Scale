import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6e6e6);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("canvas-container").appendChild(renderer.domElement);

var bananaModelVolume
var volumeRatio = 1

const lightBlue = new THREE.Color(0xadd8e6); // Light blu
const hoverColor = new THREE.Color(0x85B0BE); // Darker color for hover
const bananaHoverColor = new THREE.Color(0xb2b17a); // Darker color for hover

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
let originalColor = null;
let originalBananaColor = null;

const ambientLight = new THREE.AmbientLight(0x909090, .6); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight2.position.set(50, 50, 50);
scene.add(directionalLight2);

const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight3.position.set(-200, 100, -100);
scene.add(directionalLight3);

renderer.shadowMap.enabled = true;


const loader = new STLLoader();
loader.load('Banana_Scan_2.stl', function (geometry) {
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xfffdaf });
    material.receiveShadow = true;
    material.castShadow = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'bananaMesh';

    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = bbox.getCenter(new THREE.Vector3());

    const inchToMM = 25.4; // Conversion factor from inches to millimeters
    const gridSizeInInches = 50; // Desired grid size in inches
    const gridSizeInMM = gridSizeInInches * inchToMM; // Convert grid size to millimeters

    // Create a grid helper with the size in millimeters and the same number of divisions as inches
    const gridHelper = new THREE.GridHelper(gridSizeInMM, gridSizeInInches, 0xc2c2c2, 0xc2c2c2);

    gridHelper.position.y = -1; // Slightly below the banana to avoid z-fighting

    // Add the grid to the scene
    scene.add(gridHelper);

    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z);
    camera.position.set(center.x, center.y + (distance * 2), center.z + (distance * 1.5));
    controls.target.set(center.x, center.y, center.z);
    controls.update();

    // Display banana volume
    bananaModelVolume = (getVolume(geometry))
    console.log("computed volume of a banana: " + bananaModelVolume);

}, undefined, function (error) {
    console.error('An error happened', error);
});


console.log('Banana for Scale')
const controls = new OrbitControls(camera, renderer.domElement);

controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE
}

// Initialize TransformControls
let transformControls;

window.addEventListener('resize', function () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

document.getElementById('uploadButton').addEventListener('click', function () {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function () {
    let file = this.files[0];  // Declare 'file' with 'let'
    const reader = new FileReader();
    reader.addEventListener('load', function (event) {
        const loader = new STLLoader();
        const geometry = loader.parse(event.target.result);
        geometry.center()
        geometry.rotateX(-Math.PI / 2);

        const bbox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
        const lowestPoint = bbox.min.y;
        const bboxSize = bbox.getSize(new THREE.Vector3());

        const material = new THREE.MeshStandardMaterial({ color: lightBlue });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'userMesh';

        // // Move the model up so its lowest point is at y = 0
        mesh.position.y -= lowestPoint;

        // Apply a transform to move the part away from the banana on the X axis
        mesh.position.x += -(bboxSize.x);

        // check with known volume:
        var userModelVolume = getVolume(geometry)
        var volumeRatio = (userModelVolume / bananaModelVolume)
        console.log("computed volume of uploaded model: " + userModelVolume);
        console.log("Banana Ratio: " + volumeRatio)

        var volumeRatioDisplay = document.getElementById('volumeRatioDisplay');
        if (volumeRatioDisplay) {
            volumeRatioDisplay.textContent = `Your model is ${volumeRatio.toFixed(2)} bananas in volume`;
        }


        // Remove previous models from the scene
        const previousUserMesh = scene.getObjectByName('userMesh');

        if (transformControls && transformControls.object) {
            transformControls.detach(transformControls.object);
        }

        if (previousUserMesh) {
            scene.remove(previousUserMesh);
        }

        scene.add(mesh);
        displayRandomFact()

        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.y, size.z);

        controls.target.set(center.x, center.y, center.z);
        controls.update();

    });
    reader.readAsArrayBuffer(file);
});

function getVolume(geometry) {

    let position = geometry.attributes.position;
    let faces = position.count / 3;
    let sum = 0;
    let p1 = new THREE.Vector3(),
        p2 = new THREE.Vector3(),
        p3 = new THREE.Vector3();
    for (let i = 0; i < faces; i++) {
        p1.fromBufferAttribute(position, i * 3 + 0);
        p2.fromBufferAttribute(position, i * 3 + 1);
        p3.fromBufferAttribute(position, i * 3 + 2);
        sum += signedVolumeOfTriangle(p1, p2, p3);
    }
    return sum;

}

function signedVolumeOfTriangle(p1, p2, p3) {
    return p1.dot(p2.cross(p3)) / 6.0;
}

// After calculating volumeRatio
const volumeRatioDisplay = document.getElementById('volumeRatioDisplay');
if (volumeRatioDisplay) {
    volumeRatioDisplay.textContent = `This model is ${volumeRatio.toFixed(0)} banana in volume`;
}

window.addEventListener('mousedown', onMouseDown, false);
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mouseup', onMouseUp, false);


function onMouseMove(event) {

    // Update the mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    const userMesh = scene.getObjectByName('userMesh');
    const bananaMesh = scene.getObjectByName('bananaMesh');

    if (intersects.length > 0 && intersects[0].object === userMesh) {
        if (!originalColor) {
            originalColor = userMesh.material.color.getHex(); // Store original color
        }
        userMesh.material.color.set(hoverColor); // Change to hover color
    } else {
        if (originalColor !== null) {
            userMesh.material.color.set(originalColor); // Reset to original color
            originalColor = null; // Clear original color storage
        }
    }

    if (intersects.length > 0 && intersects[0].object === bananaMesh) {
        if (!originalBananaColor) {
            originalBananaColor = bananaMesh.material.color.getHex(); // Store original color
        }
        bananaMesh.material.color.set(bananaHoverColor); // Change to hover color
    } else {
        if (originalBananaColor !== null) {
            bananaMesh.material.color.set(originalBananaColor); // Reset to original color
            originalBananaColor = null; // Clear original color storage
        }
    }

    if (!selectedObject) {
        return;
    }

    // Create a plane at y = 0, or at the height you want the object to move along
    const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();

    // Calculate where the ray intersects the plane
    if (raycaster.ray.intersectPlane(planeY, intersection)) {
        // Update the position of the selected object to the intersection point
        selectedObject.position.x = intersection.x;
        selectedObject.position.z = intersection.z;
    }
}

function onMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0 && intersects[0].object.name === 'userMesh' || intersects.length > 0 && intersects[0].object.name === 'bananaMesh') {
        selectedObject = intersects[0].object;
        controls.enabled = false; // Disable camera controls
    }
}


function onMouseUp(event) {
    selectedObject = null;
    controls.enabled = true; // Enable camera controls
}

const bananaFacts = [
    "Bananas are believed to have originated in Southeast Asia and Papua New Guinea, dating back to at least 5000 BCE.",
    "Despite their tree-like appearance, bananas grow on plants that are actually classified as an herb.",
    "Bananas are considered to be the world's first fruit.",
    "Almost all the bananas sold in stores are cloned from just one variety, the Cavendish banana plant.",
    "The lack of genetic diversity makes bananas particularly susceptible to diseases, like Panama disease.",
    "Bananas are high in potassium, vitamin B6, vitamin C, and fiber.",
    "Ethylene gas released by bananas accelerates the ripening process.",
    "India is the world's largest producer of bananas, followed by China and Indonesia.",
    "There are over 1,000 different varieties of bananas worldwide.",
    "The term “Banana Republic” was coined for countries heavily dependent on banana exports.",
    "Banana peels can be used for polishing shoes or relieving itching from bug bites.",
    "In many cuisines, bananas are cooked and used like vegetables.",
    "Bananas were introduced to the Americas by Portuguese sailors in the 16th century.",
    "Bananas were part of the diet for astronauts on various space missions.",
    "Bananas can have a mild mood-lifting effect as they contain tryptophan.",
    "In some cultures, bananas are symbolic and used in rituals and religious ceremonies.",
    "Banana plants are propagated through bulb-like rhizomes.",
    "Banana plants need about 26 inches of water each year to grow well.",
    "Bananas can float in water, a characteristic shared with apples and watermelons.",
    "The average person consumes about 100 bananas per year.",
    "The scientific name for banana is 'Musa Sapientum', which means 'fruit of the wise men'.",
    "Bananas can help in combating depression due to high levels of tryptophan.",
    "Bananas are naturally slightly radioactive because of their potassium content.",
    "The inside of a banana peel can be used to polish leather and silver.",
    "In 1967, bananas were as odd in East Germany as oranges; only available on special occasions.",
    "More songs have been written about bananas than about any other fruit.",
    "Bananas don't grow on trees. They grow on plants that are officially classified as an herb.",
    "A cluster of bananas is called a 'hand', while a single banana is called a 'finger'.",
    "In Thailand, a pregnant woman will eat bananas to ensure her baby is born with a cool temperature.",
    "Bananas are curved because they grow towards the sun in a process known as negative geotropism.",
    "In Uganda, people consume an average of about 500 pounds of bananas per person per year.",
    "Bananas can be made into banana wine, banana vinegar, and even banana beer.",
    "In the 15th and 16th centuries, bananas were commonly referred to as 'Indian figs'.",
    "The 'Gros Michel' was the primary exported banana before the more familiar Cavendish type.",
    "Bananas are naturally radioactive due to their potassium content, but the radiation levels are extremely low and not harmful to humans.",
    "The world's heaviest bunch of bananas weighed over 130 pounds, making it into the Guinness World Records.",
    "In the Philippines, banana ketchup is a popular condiment made from mashed bananas, vinegar, and spices.",
    "Bananas are considered a 'brain food' because they contain essential nutrients that support cognitive function.",
    "The term 'going bananas' originated from the fruit's rapid ripening process, which can seem chaotic.",
    "Banana plants can grow up to 25 feet in height, and their leaves can be used for cooking and wrapping food.",
    "Some banana varieties, like the Blue Java banana, have a taste and texture similar to vanilla ice cream.",
    "The world's largest banana plantation covers an area of over 10,000 acres in Costa Rica.",
    "Bananas are used as an ingredient in many beauty products due to their moisturizing properties.",
    "The fiber in bananas can aid in digestion and help prevent constipation.",
    "Bananas contain an amino acid called tryptophan, which can help improve sleep quality.",
    "In some cultures, banana leaves are used as plates for serving food, and they are biodegradable.",
    "The purple banana, also known as the 'Red Dacca' banana, has a unique purple skin and sweet flavor.",
    "Bananas are one of the few fruits that do not continue to ripen after being picked.",
    "The world's largest banana producer, India, produces over 30 million tons of bananas annually.",
    "Bananas were introduced to the United States at the 1876 Philadelphia Centennial Exhibition.",
    "The banana is a symbol of fertility in many cultures and is often associated with prosperity.",
    "Bananas are rich in antioxidants, which can help protect the body from free radical damage.",
    "In Rwanda, banana beer known as 'urwagwa' is a traditional and popular alcoholic beverage.",
    "The black seeds found in some banana varieties are edible and have a nutty flavor."
];

function displayRandomFact() {
    // Select a random fact
    const randomIndex = Math.floor(Math.random() * bananaFacts.length);
    const fact = bananaFacts[randomIndex];

    // Display the fact
    document.getElementById('bananaFact').innerText = fact;
}

window.onload = displayRandomFact;

document.getElementById('uploadButton').classList.add('pulse-on-load');