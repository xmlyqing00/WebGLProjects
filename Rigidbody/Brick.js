import * as THREE from 'three'
import {getV3} from './libs.js'


class Brick {
    constructor(size, pos, velocity, gravity) {
        
        const geo = new THREE.BoxGeometry(3 * size, 1 * size, 2 * size)    
        // geo.translate(pos.x, pos.y, pos.z)
        const material = new THREE.MeshLambertMaterial({ color: 0x75c3eb })
        this.mesh = new THREE.Mesh(geo, material)
        this.mesh.position.copy(pos)
        this.mass = 1
        this.gravity = gravity
        this.boundary = 3 * size
        
        const positions = this.mesh.geometry.getAttribute('position')
        this.vertices = []
        this.face_indices = geo.getIndex()

        this.v_num = positions.count / 3
        
        // new THREE.Vector3(0, 0, 0)
        const I_arr = [0, 0, 0, 0, 0, 0, 0, 0, 0]
        for (let i = 0; i < this.v_num; i++) {
            const v = getV3(positions, i)
            this.vertices.push(v)
                
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
        this.I0_inv = this.I.clone().invert() 

        console.log('c', pos, this.mesh.position)
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
        this.I_inv = R.clone()
        this.I_inv.multiply(this.I0_inv).multiply(R.transpose())
        this.w = this.s[3].clone()
        this.w.applyMatrix3(this.I_inv)
        const w_q = new THREE.Quaternion(this.w.x, this.w.y, this.w.z, 0)
        w_q.multiply(this.s[1])
        w_q.set(w_q.x / 2, w_q.y / 2, w_q.z / 2, w_q.w / 2)
        w_q.normalize()

        const force = new THREE.Vector3(0, 0, 0)
        const torque = new THREE.Vector3(0, 0, 0)

        for (let i = 0; i < forces.length; i++) {
            const r = poses[i].clone()
            r.sub(this.s[0])
            const t = r.clone().cross(forces[i])

            force.add(forces[i].clone())
            torque.add(t.clone())
        }
        
        force.add(this.gravity)
        
        this.ds = [
            this.s[2].clone().multiplyScalar(1 / this.mass),
            w_q.clone(),
            force.clone(),
            torque.clone()
        ]
    }

    calcOneStep(h) {
        const s_new = []
        for (let i = 0; i < 4; i++) {
            if (i == 1) {
                const q = new THREE.Quaternion(
                    this.s[i].x + h * this.ds[i].x,
                    this.s[i].y + h * this.ds[i].y,
                    this.s[i].z + h * this.ds[i].z,
                    this.s[i].w + h * this.ds[i].w,
                )
                q.normalize()
                s_new.push(q.clone())
            } else {
                const v = this.s[i].clone()
                v.addScaledVector(this.ds[i], h)
                s_new.push(v.clone())
            }   
        }
        return s_new
    }

    applyNewState(s_new) {
        this.s = s_new
        this.mesh.position.copy(this.s[0])
        this.mesh.quaternion.copy(this.s[1])
    }

    getVerticesWorld(s_new = null) {
        const vertices_world = []
        for (let v of this.vertices) {
            const v_world = v.clone()
            if (s_new) {
                v_world.applyQuaternion(s_new[1])
                v_world.add(s_new[0])
            } else {
                v_world.applyQuaternion(this.s[1])
                v_world.add(this.s[0])
            }
            
            vertices_world.push(v_world.clone())
        }
        return vertices_world
    }

    checkBoundaryToGround(ylevel) {
        if (Math.abs(this.s[0].y - ylevel) > this.boundary) {
            return false
        } else {
            return true
        }
    }
}

export {Brick}