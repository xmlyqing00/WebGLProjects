var Skull = function () {

    var object = this;

    object.bodyColor = 0xccaa99; // 0xbbaaaa
    object.faceColor = 0x2ebeb0; // 0xccaa99
    object.bodyOpacity = 1;
    object.faceOpacity = 0.85;
    object.sticksOpacity = 1;
    object.renderSide = THREE.FrontSide;

    object.initBody = function (data) {

        var loader = new THREE.OBJLoader();
        object.bodyMesh = loader.parse(data["txt"]).children[0];

        setBodyProperties();
        data["state"] = 2;

    };

    object.initFace = function (data) {

        var loader = new THREE.OBJLoader();
        object.faceMesh = loader.parse(data["txt"]).children[0];

        setFaceProperties();
        data["state"] = 2;

    };

    object.initSticks = function (data) {

        generateSticks(data["txt"]);
        data["state"] = 2;

    };

    // functions
    function setBodyProperties() {
        object.bodyMesh.material.side = THREE.DoubleSide; // object.renderSide;
        object.bodyMesh.material.color.set(object.bodyColor);
        object.bodyMesh.material.transparent = true;
        object.bodyMesh.material.opacity = object.bodyOpacity;
        object.bodyMesh.renderOrder = 0;
        // console.log("Body Material", object.bodyMesh.material);
    }

    function setFaceProperties() {
        object.faceMesh.material.side = object.renderSide;
        object.faceMesh.material.color.set(object.faceColor);
        object.faceMesh.material.transparent = true;
        object.faceMesh.material.opacity = object.faceOpacity;
        object.faceMesh.renderOrder = 2;
        // console.log("Face Material", object.faceMesh.material);
    }

    function generateSticks(sticksTxt) {

        var arr = sticksTxt.split("\n");
        object.sticksMesh = [];
        object.sticks = [];

        for (var i = 0; i < arr.length; i += 2) {

            if (arr[i].length == 0) continue;

            var tuple0 = arr[i].split(" ");
            var tuple1 = arr[i + 1].split(" ");

            if (tuple0[0] == "Vertex" && tuple1[0] == "Vertex") {

                for (var j = 2; j < 5; j++) tuple0[j] = parseFloat(tuple0[j]);
                for (var j = 2; j < 5; j++) tuple1[j] = parseFloat(tuple1[j]);

                var startPt = new THREE.Vector3(tuple0[2], tuple0[3], tuple0[4]);
                var vec = new THREE.Vector3(tuple1[2] - tuple0[2], tuple1[3] - tuple0[3], tuple1[4] - tuple0[4]);
                var len = vec.length();
                vec.normalize();

                var axis = getRotationAxis(vec);
                var angle = getRotationAngle(vec);
                // console.log(axis, angle);

                var stick = {
                    "startPt": startPt,
                    "vec": vec,
                    "len": len,
                    "axis": axis,
                    "angle": angle,
                    "highlight": false,
                };
                object.sticks.push(stick);

                var stickMesh = getStickMesh(stick, object.sticksOpacity);
                object.sticksMesh.push(stickMesh);

            }

        }

    }

};

// functions

function getRotationAxis(vec) {

    //Three.js uses a Y up coordinate system, so the cube inits with this vector
    var upAxis = new THREE.Vector3(0, 1, 0);

    //cross product of the up vector and direction vector
    var axis = new THREE.Vector3();
    axis.crossVectors(upAxis, vec);
    axis.normalize();

    return axis;

}

function getRotationAngle(vec) {

    //Three.js uses a Y up coordinate system, so the cube inits with this vector
    var upAxis = new THREE.Vector3(0, 1, 0);

    //euler angle between direction vector and up vector
    var angle = Math.acos(upAxis.dot(vec));

    return angle;

}

function getStickMesh(stick, opacity) {

    var defaultColor = 0xff9900;// 0xC29DF1;
    var highlightColor = 0xff0000; // 0xff9900;

    var geometry = new THREE.CylinderGeometry(1, 1, stick.len, 16);

    var material = new THREE.MeshPhongMaterial();
    material.side = THREE.DoubleSide;
    material.transparent = true;
    material.opacity = opacity;
    if (stick.highlight) {
        material.color = new THREE.Color(highlightColor);
    } else {
        material.color = new THREE.Color(defaultColor);
    }

    var halfLen = stick.len / 2;
    var centerPt = new THREE.Vector3(
        stick.startPt.x + halfLen * stick.vec.x,
        stick.startPt.y + halfLen * stick.vec.y,
        stick.startPt.z + halfLen * stick.vec.z,
    );

    var cylinderMesh = new THREE.Mesh(geometry, material);
    cylinderMesh.setRotationFromAxisAngle(stick.axis, stick.angle);
    cylinderMesh.position.set(centerPt.x, centerPt.y, centerPt.z);
    cylinderMesh.renderOrder = 1;
    // console.log(cylinderMesh.position);

    return cylinderMesh;

}
