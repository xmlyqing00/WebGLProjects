var uploadedData = {};
var uploadedDataName = {};
var defaultDataName = "european";
var subFolderName = "ani2";
var viewAllChecked = false;

var scale = 130;
var camera, controls, scene, renderer, stats, animationId;
var spotLight0, spotLight1, spotLight2, spotLight3;
var skull;

var cameraDefaultTarget = {
    "x": 0, 
    "y": -10,
    "z": 0
};

var cameraDefaultPosition = {
    "x": -120,
    "y": 20,
    "z": 340
};

var spotLightDefaultY = -scale;

$(document).ready(function () {

    if (!Detector.webgl) Detector.addGetWebGLMessage();

});

// functions

function getFrame() {

    if (uploadedData.body && uploadedData.body.state == 1) {
        skull.initBody(uploadedData.body);
    }

    var countState = 0;
    for (index in uploadedData) {
        if (uploadedData[index].state >= 2) countState++;
    }

    if (countState == 3) {

        clearScene();

        if (uploadedData.body.state == 2) uploadedData.body.state = 4;

        skull.faceOpacity = 1;
        spotLightDefaultY = -10;

        if (viewAllChecked){
            skull.faceOpacity = 0.5;
        }

        initScene();

        controls.update();

        var firstIdx = parseInt($("#first-frame-idx")[0].value);
        var lastIdx = parseInt($("#last-frame-idx")[0].value);
        var frameIdx = firstIdx;
        var step = 1;

        uploadedDataName["face"] = "frame-" + frameIdx;
        uploadedData["face"] = {"state" : 0};

        if (viewAllChecked) {
            uploadedDataName["sticks"] = "frame-" + frameIdx;
            uploadedData["sticks"] = {"state" : 0};
        }

        readFileFromServer(subFolderName + "/" + uploadedDataName.face + ".obj", "face", uploadedData, saveFrame);

        if (viewAllChecked) {
            readFileFromServer(subFolderName + "/" + uploadedDataName.sticks + "_stick.cm", "sticks", uploadedData, saveFrame);
        }

        function saveFrame() {
            
            if (uploadedData.face.state == 1) {
                skull.initFace(uploadedData.face);
            }

            if (viewAllChecked && uploadedData.sticks.state == 1) {
                skull.initSticks(uploadedData.sticks);
            }

            if (uploadedData.face.state != 2 || (viewAllChecked && uploadedData.sticks.state != 2)) {
                return;
            } else {
                uploadedData.face.state = 4;
                if (viewAllChecked) {
                    uploadedData.sticks.state = 4;
                }    
            }

            // current frame
            console.log("[INFO] Save", frameIdx, "frame.");
            
            scene.add(skull.faceMesh);

            if (viewAllChecked) {
                for (var i = 0; i < skull.sticksMesh.length; i++) {
                    scene.add(skull.sticksMesh[i]);
                }
            }

            renderer.render(scene, camera);

            saveSceneSquareSize(uploadedDataName["face"] + ".png");

            // next frame
            frameIdx = frameIdx + step;
            if (frameIdx > lastIdx) return;

            uploadedDataName["face"] = "frame-" + frameIdx;
            uploadedData["face"] = {"state" : 0};

            scene.remove(skull.faceMesh);
            skull.faceMesh.geometry.dispose();
            skull.faceMesh.material.dispose();

            readFileFromServer(subFolderName + "/" + uploadedDataName["face"] + ".obj", "face", uploadedData, saveFrame);

            if (viewAllChecked) {
                uploadedDataName["sticks"] = "frame-" + frameIdx;
                uploadedData["face"] = {"state" : 0};

                for (var i = 0; i < skull.sticksMesh.length; i++) {
                    scene.remove(skull.sticksMesh[i]);
                    skull.sticksMesh[i].geometry.dispose();
                    skull.sticksMesh[i].material.dispose();

                    readFileFromServer(subFolderName + "/" + uploadedDataName.sticks + "_stick.cm", "sticks", uploadedData, saveFrame);
                }
            }

        }

    }

}

function getMesh() {

    if (uploadedData.body && uploadedData.body.state == 1) {
        skull.initBody(uploadedData.body);
    }

    if (uploadedData.face && uploadedData.face.state == 1) {
        skull.initFace(uploadedData.face);
    }

    if (uploadedData.sticks && uploadedData.sticks.state == 1) {
        skull.initSticks(uploadedData.sticks);
    }

    var countState = 0;
    for (index in uploadedData) {
        if (uploadedData[index].state >= 2) countState++;
    }

    if (countState == 3) {

        for (index in uploadedData) {
            if (uploadedData[index].state == 2) uploadedData[index].state = 4;
        }

        initScene();
        animate();

        initControls();

    }

}

function clearScene() {

    $("#scene").remove();
    $("#stats").remove();
    cancelAnimationFrame(animationId);

    console.log(" ");
    console.log("[INFO] Clear scene.");

    $("#screenshot-btn")[0].disabled = true;

    $("#save-sticks")[0].disabled = true;
    $("#stick-index")[0].disabled = true;
    $("#stick-length-range")[0].disabled = true;
    $("#stick-length-input")[0].disabled = true;

    $("#double-side")[0].disabled = true;
    $("#white-background")[0].disabled = true;

    $("#face-opacity-range")[0].disabled = true;
    $("#face-opacity-input")[0].disabled = true;
    // $("#body-opacity-range")[0].disabled = true;
    // $("#body-opacity-input")[0].disabled = true;
    // $("#sticks-opacity-range")[0].disabled = true;
    // $("#sticks-opacity-input")[0].disabled = true;

    $("#set-camera-position")[0].disabled = true;
    $("#set-camera-target")[0].disabled = true;

    console.log("[INFO] Disabled components.");

}

function initScene() {

    var canvas = $("#scene-container")[0];

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setClearColor(0x000000);
    renderer.domElement.id = "scene";
    canvas.append(renderer.domElement);

    // camera
    camera = new THREE.PerspectiveCamera(45, canvas.offsetWidth / canvas.offsetHeight, 0.01, 4000);
    camera.position.set(cameraDefaultPosition.x, cameraDefaultPosition.y, cameraDefaultPosition.z);

    scene = new THREE.Scene();

    // axes helper
    // axes = new THREE.AxesHelper(scale * 2)
    // scene.add(axes);

    // light
    var ambientIntensity = 0.7;
    var spotIntensity = 0.4;

    var ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
    scene.add(ambientLight);

    spotLight0 = new THREE.SpotLight(0xffffff, spotIntensity);
    spotLight0.position.set(scale * 2, spotLightDefaultY, scale * 2);
    spotLight0.angle = Math.PI / 4;
    scene.add(spotLight0);

    spotLight1 = new THREE.SpotLight(0xffffff, spotIntensity);
    spotLight1.position.set(-scale * 2, spotLightDefaultY, -scale * 2);
    spotLight1.angle = Math.PI / 4;
    scene.add(spotLight1);

    spotLight2 = new THREE.SpotLight(0xffffff, spotIntensity);
    spotLight2.position.set(-scale * 2, spotLightDefaultY, scale * 2);
    spotLight2.angle = Math.PI / 4;
    scene.add(spotLight2);

    spotLight3 = new THREE.SpotLight(0xffffff, spotIntensity);
    spotLight3.position.set(scale * 2, spotLightDefaultY, -scale * 2);
    spotLight3.angle = Math.PI / 4;
    scene.add(spotLight3);

    // light helper
    // lightHelper0 = new THREE.SpotLightHelper( spotLight0 );
    // scene.add( lightHelper0 );

    // lightHelper1 = new THREE.SpotLightHelper( spotLight1 );
    // scene.add( lightHelper1 );

    // controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.maxDistance = scale * 8;
    controls.target.set(cameraDefaultTarget.x, cameraDefaultTarget.y, cameraDefaultTarget.z);
    $("#camera-target-x").html(cameraDefaultTarget.x);
    $("#camera-target-y").html(cameraDefaultTarget.y);
    $("#camera-target-z").html(cameraDefaultTarget.z);
    // controls.update();

    // Add skull
    if (uploadedData["body"].state == 4) scene.add(skull.bodyMesh);
    if (uploadedData["face"].state == 4) scene.add(skull.faceMesh);
    if (uploadedData["sticks"].state == 4) {
        for (var i = 0; i < skull.sticksMesh.length; i++) {
            scene.add(skull.sticksMesh[i]);
        }
    }

    console.log("[INFO] Add skull elements done.");

    // stats
    stats = new Stats();
    stats.domElement.id = "stats";
    stats.domElement.style.zIndex = 100;
    $("#stats-container")[0].prepend(stats.domElement);

}

function onWindowResize() {

    camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

}

function animate() {

    animationId = requestAnimationFrame(animate);

    $("#camera-position-x").html(Math.floor(camera.position.x * 10) / 10);
    $("#camera-position-y").html(Math.floor(camera.position.y * 10) / 10);
    $("#camera-position-z").html(Math.floor(camera.position.z * 10) / 10);

    controls.update();
    stats.update();
    renderer.render(scene, camera);

}

function initControls() {

    $("#screenshot-btn")[0].disabled = false;

    // Render Side
    $("#double-side")[0].disabled = false;
    $("#white-background")[0].disabled = false;

    // Camera
    $("#set-camera-position")[0].disabled = false;
    $("#set-camera-target")[0].disabled = false;

    if (uploadedData["sticks"].state == 4) {

        // var stickIndex = 0;

        var stickIndexObj = $("#stick-index")[0];
        stickIndexObj.disabled = false;
        for (var i = 0; i < skull.sticks.length; i++) {
            var optionObj = $("<option value=\"" + i.toString() + "\">" + i.toString() + "</option>")[0];
            stickIndexObj.append(optionObj);
        }
        // stickIndexObj.value = 0;

        // Init stick length
        var stickLengthRangeObj = $("#stick-length-range")[0];
        stickLengthRangeObj.disabled = false;
        // stickLengthRangeObj.value = skull.sticks[stickIndex].len;

        var stickLengthInputObj = $("#stick-length-input")[0];
        stickLengthInputObj.disabled = false;
        // stickLengthInputObj.value = skull.sticks[stickIndex].len;

        // skull.sticks[stickIndex].highlight = true;
        // updateStickMesh(stickIndex);

        // Save sticks
        $("#save-sticks")[0].disabled = false;

        console.log("[INFO] Init controls done.");

    }

    if (uploadedData["face"].state == 4) {

        // Init face opacity
        var faceOpacityRangeObj = $("#face-opacity-range")[0];
        faceOpacityRangeObj.disabled = false;
        faceOpacityRangeObj.value = skull.faceOpacity;

        var faceOpacityInputObj = $("#face-opacity-input")[0];
        faceOpacityInputObj.disabled = false;
        faceOpacityInputObj.value = skull.faceOpacity;

    }

    // if (uploadedData["body"].state == 4) {

    //     // Init body opacity
    //     var bodyOpacityRangeObj = $("#body-opacity-range")[0];
    //     bodyOpacityRangeObj.disabled = false;
    //     bodyOpacityRangeObj.value = skull.bodyOpacity;

    //     var bodyOpacityInputObj = $("#body-opacity-input")[0];
    //     bodyOpacityInputObj.disabled = false;
    //     bodyOpacityInputObj.value = skull.bodyOpacity;

    // }

    // if (uploadedData["sticks"].state == 4) {

    //     // Init sticks opacity
    //     var sticksOpacityRangeObj = $("#sticks-opacity-range")[0];
    //     sticksOpacityRangeObj.disabled = false;
    //     sticksOpacityRangeObj.value = skull.sticksOpacity;

    //     var sticksOpacityInputObj = $("#sticks-opacity-input")[0];
    //     sticksOpacityInputObj.disabled = false;
    //     sticksOpacityInputObj.value = skull.sticksOpacity;

    // }

}

// Change Stick Length
function changeStickIndex() {

    var stickIndex = $("#stick-index")[0].value;
    var stickLengthRangeObj = $("#stick-length-range")[0];
    var stickLengthInputObj = $("#stick-length-input")[0];

    console.log("Select stick ", stickIndex, ", Stick length ", skull.sticks[stickIndex].len);
    stickLengthRangeObj.value = skull.sticks[stickIndex].len;
    stickLengthInputObj.value = skull.sticks[stickIndex].len;

    for (var i = 0; i < skull.sticks.length; i++) {

        if (i == stickIndex) {
            skull.sticks[stickIndex].highlight = true;
            updateStickMesh(stickIndex);
        } else {
            if (skull.sticks[i].highlight == true) {
                skull.sticks[i].highlight = false;
                updateStickMesh(i);
            }
        }

    }

}

function updateStickMesh(stickIndex) {

    var newStickMesh = getStickMesh(skull.sticks[stickIndex], skull.sticksOpacity);
    scene.remove(skull.sticksMesh[stickIndex]);
    skull.sticksMesh[stickIndex].geometry.dispose();
    skull.sticksMesh[stickIndex].material.dispose();

    skull.sticksMesh[stickIndex] = newStickMesh;
    scene.add(skull.sticksMesh[stickIndex]);

}

function changeStickLengthByRange() {

    var stickIndex = $("#stick-index")[0].value;
    var stickLength = $("#stick-length-range")[0].value;
    var stickLengthInputObj = $("#stick-length-input")[0];

    console.log("Change stick by range ", stickIndex, ", length to ", stickLength);
    stickLengthInputObj.value = stickLength;

    skull.sticks[stickIndex].len = stickLength;
    updateStickMesh(stickIndex);

}

function changeStickLengthByInput() {

    var stickIndex = $("#stick-index")[0].value;
    var stickLength = $("#stick-length-input")[0].value;
    var stickLengthInputObj = $("#stick-length-input")[0];
    var stickLengthRangeObj = $("#stick-length-range")[0];
    var updateStickLength = false;

    if (stickLength.length == 0 || isNaN(stickLength)) {
        console.log("Change stick by input ", stickLength, " not a number");
        return;
    } else {
        stickLength = parseFloat(stickLength);
        if (stickLength > 30 || stickLength < 0) {
            updateStickLength = true;
        }
        stickLength = Math.min(30, stickLength);
        stickLength = Math.max(0, stickLength);
    }

    console.log("Change stick by input ", stickIndex, ", length to ", stickLength);

    if (updateStickLength) {
        stickLengthInputObj.value = stickLength;
    }
    stickLengthRangeObj.value = stickLength;

    skull.sticks[stickIndex].len = stickLength;
    updateStickMesh(stickIndex);

}

function setCameraPosition() {

    var x = $("#set-camera-position-x")[0].value;
    var y = $("#set-camera-position-y")[0].value;
    var z = $("#set-camera-position-z")[0].value;

    camera.position.set(x, y, z);

}

function setCameraTarget() {

    var x = parseInt($("#set-camera-target-x")[0].value);
    var y = parseInt($("#set-camera-target-y")[0].value);
    var z = parseInt($("#set-camera-target-z")[0].value);

    controls.target.set(x, y, z);
    spotLight0.position.set(spotLight0.position.x, y, spotLight0.position.z);
    spotLight1.position.set(spotLight1.position.x, y, spotLight1.position.z);
    spotLight2.position.set(spotLight2.position.x, y, spotLight2.position.z);
    spotLight3.position.set(spotLight3.position.x, y, spotLight3.position.z);

    $("#camera-target-x").html(x);
    $("#camera-target-y").html(y);
    $("#camera-target-z").html(z);

}

function setRenderSide() {

    var doubleSide = $("#double-side")[0].checked;

    if (doubleSide) {
        skull.renderSide = THREE.DoubleSide;
    } else {
        skull.renderSide = THREE.FrontSide;
    }

    if (uploadedData["face"].state == 4) {
        skull.faceMesh.material.side = skull.renderSide;
    }
    
    if (uploadedData["body"].state == 4) {
        skull.bodyMesh.material.side = skull.renderSide;
    }

    console.log("Change render side as", (doubleSide) ? "DoubleSide" : "SingleSide");

}

function setWhiteBackground() {

    var whiteBackground = $("#white-background")[0].checked;

    if (whiteBackground) {
        renderer.setClearColor(0xffffff);
    } else {
        renderer.setClearColor(0x000000);
    }

    console.log("Change background color", (whiteBackground) ? "white": "black");

}

// Change Face Opacity
function changeFaceOpacityByRange() {

    var opacity = $("#face-opacity-range")[0].value;
    var faceOpacityInputObj = $("#face-opacity-input")[0];

    console.log("Change face opacity by range to ", opacity);
    faceOpacityInputObj.value = opacity;

    skull.faceOpacity = opacity;
    skull.faceMesh.material.opacity = opacity;

}

function changeFaceOpacityByInput() {

    var opacity = $("#face-opacity-input")[0].value;
    var faceOpacityInputObj = $("#face-opacity-input")[0];
    var faceOpacityRangeObj = $("#face-opacity-range")[0];
    var updateOpacity = false;

    if (opacity.length == 0 || isNaN(opacity)) {
        console.log("Change face opacity by input ", opacity, " not a number");
        return 0;
    } else {
        opacity = parseFloat(opacity);
        if (opacity > 1 || opacity < 0) {
            updateOpacity = true;
        }
        opacity = Math.min(1, opacity);
        opacity = Math.max(0, opacity);
    }

    console.log("Change face opacity by input to ", opacity);

    if (updateOpacity) {
        faceOpacityInputObj.value = opacity;
    }
    faceOpacityRangeObj.value = opacity;

    skull.faceOpacity = opacity;
    skull.faceMesh.material.opacity = opacity;

}

// Change body Opacity
function changeBodyOpacityByRange() {

    var opacity = $("#body-opacity-range")[0].value;
    var bodyOpacityInputObj = $("#body-opacity-input")[0];

    console.log("Change body opacity by range to ", opacity);
    bodyOpacityInputObj.value = opacity;

    skull.bodyOpacity = opacity;
    skull.bodyMesh.material.opacity = opacity;

}

function changeBodyOpacityByInput() {

    var opacity = $("#body-opacity-input")[0].value;
    var bodyOpacityInputObj = $("#body-opacity-input")[0];
    var bodyOpacityRangeObj = $("#body-opacity-range")[0];
    var updateOpacity = false;

    if (opacity.length == 0 || isNaN(opacity)) {
        console.log("Change body opacity by input ", opacity, " not a number");
        opacity = 0;
    } else {
        opacity = parseFloat(opacity);
        if (opacity > 1 || opacity < 0) {
            updateOpacity = true;
        }
        opacity = Math.min(1, opacity);
        opacity = Math.max(0, opacity);
    }

    console.log("Change body opacity by input to ", opacity);

    if (updateOpacity) {
        bodyOpacityInputObj.value = opacity;
    }
    bodyOpacityRangeObj.value = opacity;

    skull.bodyOpacity = opacity;
    skull.bodyMesh.material.opacity = opacity;

}

// Change sticks Opacity
function changeSticksOpacityByRange() {

    var opacity = $("#sticks-opacity-range")[0].value;
    var sticksOpacityInputObj = $("#sticks-opacity-input")[0];

    console.log("Change sticks opacity by range to ", opacity);
    sticksOpacityInputObj.value = opacity;

    skull.sticksOpacity = opacity;
    for (var i = 0; i < skull.sticks.length; i++) {
        updateStickMesh(i);
    }

}

function changeSticksOpacityByInput() {

    var opacity = $("#sticks-opacity-input")[0].value;
    var sticksOpacityInputObj = $("#sticks-opacity-input")[0];
    var sticksOpacityRangeObj = $("#sticks-opacity-range")[0];
    var updateOpacity = false;

    if (opacity.length == 0 || isNaN(opacity)) {
        console.log("Change sticks opacity by input ", opacity, " not a number");
        opacity = 0;
    } else {
        opacity = parseFloat(opacity);
        if (opacity > 1 || opacity < 0) {
            updateOpacity = true;
        }
        opacity = Math.min(1, opacity);
        opacity = Math.max(0, opacity);
    }

    console.log("Change sticks opacity by input to ", opacity);

    if (updateOpacity) {
        sticksOpacityInputObj.value = opacity;
    }
    sticksOpacityRangeObj.value = opacity;

    skull.sticksOpacity = opacity;
    for (var i = 0; i < skull.sticks.length; i++) {
        updateStickMesh(i);
    }

}