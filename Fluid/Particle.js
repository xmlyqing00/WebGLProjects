import * as THREE from 'three'


class Particle {
    constructor(size, pos, velocity, mass) {
        const geo = new THREE.SphereGeometry(size, 24, 12)
        const material = new THREE.MeshLambertMaterial({ color: 0x75c3eb })
        this.mesh = new THREE.Mesh(geo, material)
        this.mesh.position.copy(pos)

        this.pos = pos
        this.vel = velocity
        this.mass = mass
    }
}

export {Particle}
