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
        this.boundary = 10 * size
        
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
            for (let j = 0; j < 9; j++) I_arr[j] += I_v[j] * this.mass / 12
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
        const w_q = new THREE.Quaternion(this.w.x/2, this.w.y/2, this.w.z/2, 0)
        w_q.multiply(this.s[1])
        // w_q.normalize()

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
        this.s_new = []
        for (let i = 0; i < 4; i++) {
            if (i == 1) {
                const q = new THREE.Quaternion(
                    this.s[i].x + h * this.ds[i].x,
                    this.s[i].y + h * this.ds[i].y,
                    this.s[i].z + h * this.ds[i].z,
                    this.s[i].w + h * this.ds[i].w,
                )
                q.normalize()
                this.s_new.push(q.clone())
            } else {
                const v = this.s[i].clone()
                v.addScaledVector(this.ds[i], h)
                this.s_new.push(v.clone())
            }   
        }

        this.P_delta_total = new THREE.Vector3(0, 0, 0)
        this.L_delta_total = new THREE.Vector3(0, 0, 0)
        
    }

    applyNewState() {
        if (this.P_delta_total.length() > 0) {
            this.s_new[0].copy(this.s[0])
            this.s_new[1].copy(this.s[1])
            this.s_new[2].add(this.P_delta_total)
            this.s_new[3].add(this.L_delta_total)
        }

        this.s = this.s_new
        this.mesh.position.copy(this.s[0])
        this.mesh.quaternion.copy(this.s[1])
    }

    getVerticesWorld(s_tag) {
        const vertices_world = []
        for (let v of this.vertices) {
            const v_world = v.clone()
            if (s_tag == 'new') {
                v_world.applyQuaternion(this.s_new[1])
                v_world.add(this.s_new[0])
            } else {
                v_world.applyQuaternion(this.s[1])
                v_world.add(this.s[0])
            }
            
            vertices_world.push(v_world.clone())
        }
        return vertices_world
    }

    calcFacesWorld() {
        const vertices_world = this.getVerticesWorld()
        const edge_hash = new Map()

        this.faces = []
        this.edges = []
        for (let i = 0; i < this.face_indices.count; i += 3) {
            this.faces.push(new THREE.Triangle(
                vertices_world[this.face_indices.getX(i)],
                vertices_world[this.face_indices.getY(i)],
                vertices_world[this.face_indices.getZ(i)]
            ))  
            const vs = [
                this.face_indices.getX(i), 
                this.face_indices.getY(i), 
                this.face_indices.getZ(i),
                this.face_indices.getX(i)
            ]  

            for (let j = 0; j < 3; j++) {
                let hash_key = vs[j] * 10000 + vs[j+1]
                if (edge_hash.has(hash_key)) continue
                
                this.edges.push([
                    vertices_world[vs[j]], 
                    vertices_world[vs[j+1]]
                ])
                edge_hash.set(hash_key)
                hash_key = vs[j + 1] * 10000 + vs[j]
                edge_hash.set(hash_key)
            }
        }

        

    }

    checkBoundaryToGround(ground_center) {
        // if (ground_center.distanceTo(this.s[0]) > this.boundary) {
            // return false
        // } else {
            return true
        // }
    }
}

export {Brick}