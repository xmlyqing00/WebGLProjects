import * as THREE from 'three'
import {getV3} from './libs.js'

import { Particle } from './Particle.js'

class Fluid {
    constructor(num, particle_size, gravity, box) {
        
        this.num = num
        this.gravity = gravity
        
        this.particles = []
        for (let i = 0; i < num; i++) {
            const pos = new THREE.Vector3(Math.random() * 2, Math.random() * 2 + 5, Math.random() * 2)
            const vel = new THREE.Vector3(0, 0, 0)
            const mass = 1
            this.particles.push(new Particle(particle_size, pos, vel, mass))
        }
    }

    step(h) {
        for (let particle of this.particles) {
            particle.vel.addScaledVector(this.gravity, h)
            particle.pos.addScaledVector(particle.vel, h)
            particle.mesh.position.copy(particle.pos)
        }
    }
}

export {Fluid}