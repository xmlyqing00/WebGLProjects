import * as THREE from 'three'


class Particle {
    constructor(id, size, pos, velocity, mass) {
        const geo = new THREE.SphereGeometry(size, 12, 6)
        const material = new THREE.MeshLambertMaterial({ color: 0x75c3eb })
        this.mesh = new THREE.Mesh(geo, material)
        this.mesh.position.copy(pos)

        this.id = id
        this.pos = pos
        this.old_pos = pos
        this.vel = velocity
        this.mass = mass
        this.neighbors = []
        this.env_neighbors = []

    }
}

export {Particle}
