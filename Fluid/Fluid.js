import * as THREE from 'three'
import {getV3} from './libs.js'

import { Particle } from './Particle.js'

class Fluid {
    constructor(particle_num, particle_size, gravity_v3, box_r, box_c) {
        
        this.r = 5 * particle_size
        this.alpha = 0.3
        this.beta = 0.3
        this.k_spring = 1

        this.k = 5e-3
        this.k_near = 1e-2
        this.rest_density = 20
        
        // this.k_env = 1e-3
        // this.k_near_env = 1e-2
        // this.rest_density_env = 20
        // this.r_env = 1.0
    
        this.particle_num = particle_num
        this.gravity_v3 = gravity_v3
        
        this.particles = []
        for (let i = 0; i < particle_num; i++) {
            const pos = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 + 2, Math.random() * 2 - 1)
            const vel = new THREE.Vector3(0, 0, 0)
            const mass = 1
            this.particles.push(new Particle(
                i, particle_size, pos, vel, mass
            ))
        }

        // this.env_particles = []
        this.box_r = box_r
        this.box_c = box_c

    }

    updateContainer(container_move, container_r, h) {
        this.box_r = container_r
        this.box_c.addScaledVector(container_move, h)
    }

    step(h, gravity_scalar, viscosity) {

        // Apply viscosity impulse
        for (let i = 0; i < this.particle_num; i++) {
            for (let j of this.particles[i].neighbors) {

                let rij = this.particles[j].pos.clone().sub(this.particles[i].pos)
                let l = rij.length()
                if (l < this.r) {
                    rij.normalize()
                    let u = this.particles[i].vel.clone().sub(this.particles[j].vel).dot(rij)
                    if (u > 0) {
                        rij.multiplyScalar(0.5 * h * (1 - l / this.r) * (viscosity * u + this.beta * u * u))

                        this.particles[i].vel.sub(rij)
                        this.particles[j].vel.add(rij)
                    }
                }                
            }
        }
        
        const gravity = this.gravity_v3.clone().multiplyScalar(gravity_scalar)
        for (let pt of this.particles) {
            pt.neighbors = []
            // pt.env_neighbors = []
            
            pt.old_pos = pt.pos.clone()
            // Apply gravity
            pt.vel.addScaledVector(gravity, h)
            pt.pos.addScaledVector(pt.vel, h)
            
        }

        for (let i = 0; i < this.particle_num; i++) {
            for (let j = i + 1; j < this.particle_num; j++) {
                
                let rij = this.particles[j].pos.clone().sub(this.particles[i].pos)
                let l = rij.length()
                if (l < this.r) {
                    this.particles[i].neighbors.push(j)
                    this.particles[j].neighbors.push(i)
                }                
            }
        }

        // for (let i = 0; i < this.particle_num; i++) {
        //     for (let j = 0; j < this.env_particles.length; j++) {
        //         let rij_env = this.env_particles[j].pos.clone().sub(this.particles[i].pos)
        //         let l = rij_env.length()
        //         if (l < this.r_env) {
        //             this.particles[i].env_neighbors.push(j)
        //         }                
        //     }
        // }

        let springs = new Array(this.particle_num)
        for (let i = 0; i < this.particle_num; i++) {
            springs[i] = new Array(this.particle_num).fill(null)
        }

        for (let i = 0; i < this.particle_num; i++) {
            for (let j of this.particles[i].neighbors) {
                let rij = this.particles[j].pos.clone().sub(this.particles[i].pos)
                let l = rij.length()

                if (springs[i][j] == null) {
                    springs[i][j] = this.r
                    springs[j][i] = this.r
                }

                const d = 0.2 * springs[i][j]
                if (l > springs[i][j] + d) {
                    springs[i][j] += h * this.alpha * (l - springs[i][j] - d)
                    springs[j][i] = springs[i][j]
                } else if (l < springs[i][j] - d) {
                    springs[i][j] -= h * this.alpha * (springs[i][j] - d - l)
                    springs[j][i] = springs[i][j]
                }

                // console.log('adj spring', l, springs[i][j], d)
            }
        }

        for (let i = 0; i < this.particle_num; i++) {
            for (let j = i + 1; j < this.particle_num; j++) {

                if (springs[i][j] == null) continue
                if (springs[i][j] > this.r) {
                    springs[i][j] = null
                    springs[j][i] = null
                }

                let rij = this.particles[j].pos.clone().sub(this.particles[i].pos)
                let l = rij.length()
                let D = rij.clone().normalize()
                let s = 0.5 * h * h * this.k_spring * (1 - springs[i][j] / this.r) * (springs[i][j] - l)
                // console.log('spring', D, s)
                D.multiplyScalar(s)
                this.particles[i].pos.sub(D)
                this.particles[j].pos.add(D)
            }
        }

        

        for (let i = 0; i < this.particle_num; i++) {

            let rho = 0
            let rho_near = 0
            let press = 0
            let press_near = 0
            for (let j of this.particles[i].neighbors) {
                let rij = this.particles[j].pos.clone().sub(this.particles[i].pos)
                let l = rij.length()
                let q = l / this.r
                if (q < 1) {
                    rho += (1 - q) * (1 - q)
                    rho_near += (1 - q) * (1 - q) * (1 - q)
                }  
            }
            
            // console.log(rho, this.rest_density)
            press = this.k * (rho - this.rest_density)
            press_near = this.k_near * rho_near
            let dx = new THREE.Vector3(0, 0, 0)

            for (let j of this.particles[i].neighbors) {
                let rij = this.particles[j].pos.clone().sub(this.particles[i].pos)
                let l = rij.length()
                let q = l / this.r
                
                if (q < 1) {
                    let D = rij.clone().normalize()
                    let s = 0.5 * h * h * (press * (1 - q) + press_near * (1 - q) * (1 - q))
                    // if (i < 10) {
                    //     console.log('s', s, press, press_near)
                    // }
                    D.multiplyScalar(s)
                    this.particles[j].pos.add(D)
                    dx.sub(D)
                }
                
            }

            // console.log('pressure', dx)

            // for (let j of this.particles[i].env_neighbors) {
            //     let rij_env = this.env_particles[j].pos.clone().sub(this.particles[i].pos)
            //     let l = rij_env.length()
            //     let q = l / this.r
            //     if (q < 1) {
            //         rho += (1 - q) * (1 - q)
            //         rho_near += (1 - q) * (1 - q) * (1 - q)
            //     }  
            // }
            
            // press = this.k_env * (rho - this.rest_density_env)
            // press_near = this.k_near_env * rho_near

            // for (let j of this.particles[i].env_neighbors) {
            //     let rij_env = this.env_particles[j].pos.clone().sub(this.particles[i].pos)
            //     let l = rij_env.length()
            //     let q = l / this.r_env
            //     let D = rij_env.clone().normalize()
            //     if (q < 1) {
            //         D.multiplyScalar(0.5 * h * h * (press * (1 - q) + press_near * (1 - q) * (1 - q)))
            //         dx.sub(D)
            //     }
                
            // }

            // console.log(dx)
            this.particles[i].pos.add(dx)

        }
        
        const r_f = 0.8

        // console.log(this.box_c, this.box_r)
        
        for (let pt of this.particles) {
            let d = pt.pos.clone().sub(pt.old_pos)
            pt.vel.copy(d.multiplyScalar(1/h))

            if (pt.pos.y <= this.box_c.y - this.box_r * 2) {
                pt.vel = new THREE.Vector3(pt.vel.x, r_f * Math.abs(pt.vel.y), pt.vel.z)
                pt.pos = new THREE.Vector3(pt.pos.x, this.box_c.y - this.box_r * 2, pt.pos.z)
            }
            if (pt.pos.y >= this.box_c.y + this.box_r * 2) {
                pt.vel = new THREE.Vector3(pt.vel.x, -r_f * Math.abs(pt.vel.y), pt.vel.z)
                pt.pos = new THREE.Vector3(pt.pos.x, this.box_c.y + this.box_r * 2, pt.pos.z)
            }

            if (pt.pos.z >= this.box_c.z + this.box_r) {
                pt.vel = new THREE.Vector3(pt.vel.x, pt.vel.y, -r_f * Math.abs(pt.vel.z))
                pt.pos = new THREE.Vector3(pt.pos.x, pt.pos.y, this.box_c.z + this.box_r)
            } else if (pt.pos.z <= this.box_c.z - this.box_r) {
                pt.vel = new THREE.Vector3(pt.vel.x, pt.vel.y, r_f * Math.abs(pt.vel.z))
                pt.pos = new THREE.Vector3(pt.pos.x, pt.pos.y, this.box_c.z - this.box_r)
            }

            if (pt.pos.x >= this.box_c.x + this.box_r) {
                pt.vel = new THREE.Vector3(-r_f * Math.abs(pt.vel.x), pt.vel.y, pt.vel.z)
                pt.pos = new THREE.Vector3(this.box_c.x + this.box_r, pt.pos.y, pt.pos.z)
            } else if (pt.pos.x <= this.box_c.x - this.box_r) {
                pt.vel = new THREE.Vector3(r_f * Math.abs(pt.vel.x), pt.vel.y, pt.vel.z)
                pt.pos = new THREE.Vector3(this.box_c.x - this.box_r, pt.pos.y, pt.pos.z)
            }


            pt.mesh.position.copy(pt.pos)
        }
    }
}

export {Fluid}