'use strict'

import Timer from './timer.js'

// HTMLElements
const incXBtn = document.getElementById("inc-x")
const decXBtn = document.getElementById("dec-x")
const incYBtn = document.getElementById("inc-y")
const decYBtn = document.getElementById("dec-y")
const playBtn = document.getElementById("play")
const pauseBtn = document.getElementById("pause")
const stopBtn = document.getElementById("stop")
const labelElm = document.getElementById('label')
const gridElm = document.getElementById('grid')

// Assets
const click = new Audio('assets/click1.mp3')

// State
const state = {
  x: 7,
  y: 11,
  bpm: 400,
  current: undefined,
  intervalID: undefined,
}

const changeSignature = (key, val) => () => {
  state[key] += val
  updateLabel()
  buildGrid()
}

// Grid
const buildGrid = () => {
  gridElm.style.gridTemplateColumns = Array(state.x).fill("50px").join(' ')
  gridElm.style.gridTemplateRows = Array(state.y).fill("50px").join(' ')

  gridElm.textContent = ''

  for (let i = 0; i < state.x * state.y; i++) {
    const cell = document.createElement("div")
    cell.classList.add('cell');
    if (i % state.y === 0) {
      cell.classList.add('cell--secondary')
    }

    cell.textContent = `${i % state.x + 1}`
    gridElm.appendChild(cell)
  }
}

const deactivateCurrentCell = () => {
  const currCell = gridElm.childNodes[state.current]
  if (currCell) {
    currCell.classList.remove("cell--active")
  }
}

const activateCurrentCell = () => {
  const currCell = gridElm.childNodes[state.current]
  if (currCell) {
    currCell.classList.add("cell--active")
  }
}

// Signature
const updateLabel = () => {
  labelElm.textContent = `${state.x} vs ${state.y}`
}

// Audio
const metronomeCallback = () => {
  deactivateCurrentCell()

  if (state.current === undefined) {
    state.current = -1
  }
  state.current = (state.current + 1) % (state.x * state.y)

  click.play()
  click.currentTime = 0;
  activateCurrentCell()
}

const start = () => {
  if (metronome.isRunning) return
  metronome.start()
}

const pause = () => {
  if (!metronome.isRunning) return
  metronome.stop()
}

const stop = () => {
  if (metronome.isRunning) {
    metronome.stop()
  }

  deactivateCurrentCell()
  state.current = undefined
}

const metronome = new Timer(metronomeCallback, 60000 / state.bpm, { immediate: true });

// Initialization
const init = () => {
  incXBtn.addEventListener('click', changeSignature('x', 1))
  decXBtn.addEventListener('click', changeSignature('x', -1))
  incYBtn.addEventListener('click', changeSignature('y', 1))
  decYBtn.addEventListener('click', changeSignature('y', -1))
  playBtn.addEventListener('click', start)
  pauseBtn.addEventListener('click', pause)
  stopBtn.addEventListener('click', stop)

  updateLabel()
  buildGrid()
}
init()