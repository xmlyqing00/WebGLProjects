function getParam(paramName) {
    paramValue = "", isFound = !1;
    if (this.location.search.indexOf("?") == 0 && this.location.search.indexOf("=") > 1) {
        arrSource = unescape(this.location.search).substring(1, this.location.search.length).split("&"), i = 0;
        while (i < arrSource.length && !isFound) arrSource[i].indexOf("=") > 0 && arrSource[i].split("=")[0].toLowerCase() == paramName.toLowerCase() && (paramValue = arrSource[i].split("=")[1], isFound = !0), i++
    }
    return paramValue == "" && (paramValue = null), paramValue
}

function uploadData() {

    $('#upload-data-modal').modal('hide');

    clearScene();

    var bodyFile = $("#body-file")[0].files[0];
    var faceFile = $("#face-file")[0].files[0];
    var sticksFile = $("#sticks-file")[0].files[0];

    skull = new Skull();
    uploadedData = {};
    uploadedDataName = {};

    if (bodyFile == undefined) {

        uploadedData["body"] = {
            "state": 3
        };

    } else {

        var pos = bodyFile.name.indexOf(".");
        uploadedDataName["body"] = bodyFile.name.substr(0, pos);

        readFileFromClient(bodyFile, "body", uploadedData, getMesh);

    }

    if (faceFile == undefined) {

        uploadedData["face"] = {
            "state": 3
        };

    } else {

        var pos = faceFile.name.indexOf(".");
        uploadedDataName["face"] = faceFile.name.substr(0, pos);

        readFileFromClient(faceFile, "face", uploadedData, getMesh);

    }

    if (sticksFile == undefined) {

        uploadedData["sticks"] = {
            "state": 3
        };

    } else {

        var pos = sticksFile.name.indexOf(".");
        uploadedDataName["sticks"] = sticksFile.name.substr(0, pos);

        readFileFromClient(sticksFile, "sticks", uploadedData, getMesh);

    }

    getMesh();

    console.log("[INFO] Load data from client.", uploadedDataName);

}

function useDefaultData() {

    $('#upload-data-modal').modal('hide');

    uploadedDataName["body"] = defaultDataName;
    uploadedDataName["face"] = defaultDataName;
    uploadedDataName["sticks"] = defaultDataName;

    skull = new Skull();
    uploadedData = {};

    cameraDefaultPosition = {
        "x": -300,
        "y": -230,
        "z": 70
    };
    
    cameraDefaultTarget = {
        "x": 0,
        "y": -scale,
        "z": 0
    };

    clearScene();
    console.log("[INFO] Load data from server.", uploadedDataName);

    readFileFromServer(defaultDataName + "_body.obj", "body", uploadedData, getMesh);
    readFileFromServer(defaultDataName + "_face.obj", "face", uploadedData, getMesh);
    readFileFromServer(defaultDataName + "_sticks.cm", "sticks", uploadedData, getMesh);

}

function saveFrames() {

    viewAllChecked =  $("#view-all-checked")[0].checked;

    $('#upload-data-modal').modal('hide');

    skull = new Skull();

    uploadedData = {
        "face": { "state": 3 },
        "sticks": { "state": 3 },
    };

    uploadedDataName = {
        "body": "skull"
    };

    if (viewAllChecked) {
        readFileFromServer(subFolderName + "/" + uploadedDataName["body"] + ".obj", "body", uploadedData, getFrame);
    } else {
        uploadedData["body"] = {
            "state": 3
        }
        getFrame();
    }

}

function saveSticks() {

    console.log("[INFO] Save sticks.");

    var sticksStr = "";
    for (var i = 0; i < skull.sticks.length; i++) {

        sticksStr += "Vertex " + (i * 2 + 1) + " " + skull.sticks[i].startPt.x + " " + skull.sticks[i].startPt.y + " " + skull.sticks[i].startPt.z + "\n";
        var endPt_x = skull.sticks[i].startPt.x + skull.sticks[i].vec.x * skull.sticks[i].len;
        var endPt_y = skull.sticks[i].startPt.y + skull.sticks[i].vec.y * skull.sticks[i].len;
        var endPt_z = skull.sticks[i].startPt.z + skull.sticks[i].vec.z * skull.sticks[i].len;
        sticksStr += "Vertex " + (i * 2 + 2) + " " + endPt_x + " " + endPt_y + " " + endPt_z + "\n";

    }

    for (var i = 0; i < skull.sticks.length; i++) {
        sticksStr += "Edge " + (i * 2 + 1) + " " + (i * 2 + 2) + "\n";
    }

    // console.log(sticksStr);

    var fileName =
        "body_" + uploadedDataName["body"] + " " +
        "face_" + uploadedDataName["face"] + " " +
        "sticks_" + uploadedDataName["sticks"] + ".cm";
    console.log("[INFO] Save custom sticks.", fileName);

    var blob = new Blob([sticksStr], { type: "text/plain;charset=utf-8" });
    saveAs(blob, fileName);

}

function readFileFromClient(file, prefix, uploadedData, callback) {

    var fileReader = new FileReader();
    var loadingId = "#" + prefix + "-loading";

    fileReader.onload = function () {
        uploadedData[prefix] = {
            "state": 1,
            "txt": fileReader.result
        };
        $(loadingId).html(prefix + " loaded.");
        callback();
    };

    fileReader.onprogress = function (data) {
        if (data.lengthComputable) {
            var progress = parseInt(data.loaded / data.total * 100);
            $(loadingId).html(prefix + " " + progress + "%");
        }
    };

    fileReader.onerror = function (err) {
        console.error("[ERR] An error happened when loading " + prefix + ".", err);
    }

    fileReader.readAsText(file);

}

function readFileFromServer(dataName, prefix, uploadedData, callback) {

    var filePath = "models/" + dataName;
    var loadingId = "#" + prefix + "-loading";
    var fileLoader = new THREE.FileLoader();

    fileLoader.load(

        filePath, // resource URL

        function (data) { // onLoad callback
            uploadedData[prefix] = {
                "state": 1,
                "txt": data
            };
            $(loadingId).html(prefix + " loaded.");
            callback();
        },

        function (xhr) { // onProgress callback
            var progress = Math.floor(xhr.loaded / xhr.total * 100);
            if (!isNaN(progress)) {
                $(loadingId).html(prefix + " " + progress + "%");
            }
        },

        function (err) { // onError callback
            console.error("[ERR] An error happened when loading " + prefix + ".", filePath, err);
        }

    );

}

function saveSceneFullSize() {

    var scene = $("#scene")[0];

    scene.toBlob(function (blob) {
        saveAs(blob, "3D Skull - Full Size.png");
    });

    $('#screenshot-modal').modal('hide');

}

function saveSceneSquareSize(fileName = null) {

    var scene = $("#scene")[0];

    var rect = {
        "left": (scene.width - scene.height) / 2,
        "top": 0,
        "width": scene.height,
        "height": scene.height
    };

    saveSceneByRect(rect, fileName);

    $('#screenshot-modal').modal('hide');

}

function saveSceneCustomSize(fileName = null) {

    var rect = {
        "left": $("#screenshot-left")[0].value,
        "top": $("#screenshot-top")[0].value,
        "width": $("#screenshot-width")[0].value,
        "height": $("#screenshot-height")[0].value
    };

    saveSceneByRect(rect, fileName);

    $('#screenshot-modal').modal('hide');

}

function saveSceneByRect(rect, fileName = null) {

    var scene = $("#scene")[0];
    var img = new Image();
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var right = parseInt(rect.left) + parseInt(rect.width);
    var bottom = parseInt(rect.top) + parseInt(rect.height);

    if (fileName == null) {
        fileName = "Skull 3D - " + rect.left + "x" + rect.top + " - " + right + "x" + bottom + ".png";
    }

    canvas.width = rect.width;
    canvas.height = rect.height;

    img.src = scene.toDataURL("image/png", 1);
    img.onload = function () {

        ctx.drawImage(img,
            rect.left, rect.top, rect.width, rect.height,
            0, 0, rect.width, rect.height);

        canvas.toBlob(function (blob) {
            saveAs(blob, fileName);
        });

    };

}

function saveFaceOpacityFrames() {

    $('#screenshot-modal').modal('hide');

    var faceOpacityInputObj = $("#face-opacity-input")[0];
    var faceOpacityRangeObj = $("#face-opacity-range")[0];

    var id = 0;

    for (var i = 0; i < 10; i++) {
        
        setTimeout(function () {

            var opacity = id / 10.0;

            faceOpacityInputObj.value = opacity;
            faceOpacityRangeObj.value = opacity;
            
            skull.faceOpacity = opacity;
            skull.faceMesh.material.opacity = opacity;

            renderer.render(scene, camera);

            saveSceneSquareSize("face opacity frame-" + id + ".png");

            id = id + 1;

        }, i * 1000);

    }

}