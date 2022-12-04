import * as THREE from "three"

function getV3(buffer_attribute, offset) {
    // const offset = idx
    return new THREE.Vector3(buffer_attribute.getX(offset), buffer_attribute.getY(offset), buffer_attribute.getZ(offset))
}

function getFaces(mesh, invert_normal=false) {
    const vertices = mesh.geometry.getAttribute("position")
    let faces = []
    
    for (let i = 0; i < vertices.count; i += 3) {
        let tri = []
        for (let j = 0; j < 3; j ++) {
            const base = i + j
            const v = new THREE.Vector3(vertices.getX(base), vertices.getY(base), vertices.getZ(base))
            v.add(mesh.position)
            tri.push(v)
        }
        if (invert_normal) {
            faces.push(new THREE.Triangle(tri[0], tri[2], tri[1]))
        } else {
            faces.push(new THREE.Triangle(tri[0], tri[1], tri[2]))
        }
    }

    return faces
}

export {getV3}