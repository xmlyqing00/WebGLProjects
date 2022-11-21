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

class Brick {
    constructor(size, pos, velocity, gravity) {
        
        const geo = new THREE.BoxGeometry(3 * size, 1 * size, 2 * size)    
        geo.translate(pos.x, pos.y, pos.z)
        const material = new THREE.MeshLambertMaterial({ color: 0x75c3eb })
        this.mesh = new THREE.Mesh(geo, material)
        this.mass = 1
        this.gravity = gravity
        
        this.vertices = this.mesh.geometry.getAttribute('position')
        this.face_indices = geo.getIndex()

        this.v_num = this.vertices.count / 3
        
        // new THREE.Vector3(0, 0, 0)
        const I_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0]
        for (let i = 0; i < this.v_num; i++) {
            const v = getV3(this.vertices, i)
                
            const I_v = [
                v.y * v.y + v.z * v.z,
                -v.x * v.y,
                v.x * v.z,
                -v.x * v.y,
                v.x * v.x + v.z * v.z,
                -v.y * v.z,
                -v.x * v.z,
                -v.y * v.z,
                v.x * v.x + v.y * v.y
            ]
            for (let j = 0; j < 9; j++) I_arr[j] += I_v[j] * this.mass / 96
        }
        
        this.I = new THREE.Matrix3()
        this.I.set(
            I_arr[0], I_arr[1], I_arr[2], 
            I_arr[3], I_arr[4], I_arr[5], 
            I_arr[6], I_arr[7], I_arr[8]
        )
        this.I0_inv = this.I.invert() 

        console.log('c', pos)
        console.log('I', this.I)
        console.log('v', this.vertices)
        console.log('f', this.face_indices)
        
        this.s = [
            pos.clone(),                                 // x
            new THREE.Quaternion().identity(),      // q
            velocity.clone().multiplyScalar(this.mass), // P
            new THREE.Vector3(0, 0, 0),             // L
        ]
        this.ds = [
            velocity,
            new THREE.Quaternion().identity(),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ]
    }

    computeGrad(forces = [], poses = []) {
        const mat4 = new THREE.Matrix4().makeRotationFromQuaternion(this.s[1])
        const R = new THREE.Matrix3().setFromMatrix4(mat4)
        const I_inv = R.clone()
        I_inv.multiply(this.I0_inv).multiply(R.transpose())
        const w = this.s[3].clone()
        w.applyMatrix3(I_inv)
        const w_q = new THREE.Quaternion(0, w.x/2, w.y/2, w.z/2)
        w_q.multiply(this.s[1])

        const force = new THREE.Vector3(0, 0, 0)
        const torque = new THREE.Vector3(0, 0, 0)

        for (let i = 0; i < forces.length; i++) {
            const r = poses[i].clone()
            r.sub(this.s[0])
            const t = forces[i].clone().cross(r)

            force.add(forces[i].clone())
            torque.add(t.clone())
        }
        
        force.add(this.gravity)
        
        this.ds = [
            this.s[2].clone().multiplyScalar(1 / this.mass),
            w_q,
            force,
            torque
        ]
    }

    updateStates(h) {
        for (let i = 0; i < 4; i++) {
            if (i == 1) {
                const q = new THREE.Quaternion(
                    this.s[i].x + h * this.ds[i].x,
                    this.s[i].y + h * this.ds[i].y,
                    this.s[i].z + h * this.ds[i].z,
                    this.s[i].w + h * this.ds[i].w,
                )
                q.normalize()
                this.s[i] = q.clone()
            } else {
                this.s[i].addScaledVector(this.ds[i], h)
            }   
        }

        this.mesh.position.copy(this.s[0])
        this.mesh.quaternion.copy(this.s[1])
    }
}

export {Brick}