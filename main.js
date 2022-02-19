// *********************************************************************************************************************
// HTMLElements
// *********************************************************************************************************************
const incXBtn = document.getElementById("inc-x")
const decXBtn = document.getElementById("dec-x")
const incYBtn = document.getElementById("inc-y")
const decYBtn = document.getElementById("dec-y")
const playBtn = document.getElementById("play")
const pauseBtn = document.getElementById("pause")
const stopBtn = document.getElementById("stop")
const labelElm = document.getElementById('label')
const gridElm = document.getElementById('grid')

// *********************************************************************************************************************
// Constants
// *********************************************************************************************************************
const NOTE_LENGTH = 0.05 // beep length in seconds
const SCHEDULE_AHEAD_TIME = 0.25

// *********************************************************************************************************************
// AudioContext
// *********************************************************************************************************************
let audioContext = undefined

// *********************************************************************************************************************
// State
// *********************************************************************************************************************
const state = {
  x: 7,
  y: 11,
  bpm: 80,

  currentNote: undefined,
  noteToBeScheduled: undefined, // next note to be scheduled, number in range [0, x*y)

  nextNoteTime: undefined, // time when next note is to be played

  intervalID: undefined, // intervalID of setTimeout which schedules notes
}

const changeSignature = (key, val) => () => {
  state[key] += val
  renderLabel()
  renderGrid()
}

// *********************************************************************************************************************
// Grid
// *********************************************************************************************************************
const renderGrid = () => {
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
  const currCell = gridElm.childNodes[state.currentNote]
  if (currCell) {
    currCell.classList.remove("cell--active")
  }
}

const activateCurrentCell = () => {
  const currCell = gridElm.childNodes[state.currentNote]
  if (currCell) {
    currCell.classList.add("cell--active")
  }
}

// *********************************************************************************************************************
// Signature Label
// *********************************************************************************************************************
const renderLabel = () => {
  labelElm.textContent = `${state.x} vs ${state.y}`
}

// *********************************************************************************************************************
// Audio
// *********************************************************************************************************************
const scheduleNotes = () => {
  while (state.nextNoteTime < audioContext.currentTime + SCHEDULE_AHEAD_TIME) {


    if (state.noteToBeScheduled % state.x === 0) {
      const osc = audioContext.createOscillator();
      osc.connect(audioContext.destination);
      osc.frequency.value = 880.0

      osc.start(state.nextNoteTime)
      osc.stop(state.nextNoteTime + NOTE_LENGTH)
    }
    if (state.noteToBeScheduled % state.y === 0) {
      const osc = audioContext.createOscillator();
      osc.connect(audioContext.destination);
      osc.frequency.value = 440.0

      osc.start(state.nextNoteTime)
      osc.stop(state.nextNoteTime + NOTE_LENGTH)
    }
    // if (state.noteToBeScheduled % state.x !== 0 && state.noteToBeScheduled % state.y !== 0) {
    //   const osc = audioContext.createOscillator();
    //   osc.connect(audioContext.destination);
    //   osc.frequency.value = 220.0
    //
    //   osc.start(state.nextNoteTime)
    //   osc.stop(state.nextNoteTime + NOTE_LENGTH)
    // }

    const secondsPerBeat = 60.0 / state.bpm / state.x
    state.nextNoteTime += secondsPerBeat

    state.noteToBeScheduled = (state.noteToBeScheduled + 1) % (state.x * state.y)
  }
}

// *********************************************************************************************************************
// Controls
// *********************************************************************************************************************
const start = () => {
  if (!audioContext) {
    audioContext = new AudioContext()

    // unlock audio
    // TODO: do we need this?
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const node = audioContext.createBufferSource();
    node.buffer = buffer;
    node.start(0);
  }
  if (state.intervalID) return
  state.nextNoteTime = audioContext.currentTime + SCHEDULE_AHEAD_TIME
  state.noteToBeScheduled = 0

  state.intervalID = setInterval(() => {
    scheduleNotes()
  }, 100)
}

const pause = () => {
  if (!state.intervalID) return
  clearInterval(state.intervalID)
  state.intervalID = undefined
}

const stop = () => {
  if (state.intervalID) {
    clearInterval(state.intervalID)
    state.intervalID = undefined
  }

  deactivateCurrentCell()
  state.currentNote = undefined
}

// *********************************************************************************************************************
// Initialization
// *********************************************************************************************************************
const init = () => {
  incXBtn.addEventListener('click', () => {
    changeSignature('x', 1)();
    stop()
  })
  decXBtn.addEventListener('click', () => {
    changeSignature('x', -1)();
    stop()
  })
  incYBtn.addEventListener('click', () => {
    changeSignature('y', 1)();
    stop()
  })
  decYBtn.addEventListener('click', () => {
    changeSignature('y', -1)();
    stop()
  })
  playBtn.addEventListener('click', start)
  pauseBtn.addEventListener('click', pause)
  stopBtn.addEventListener('click', stop)

  renderLabel()
  renderGrid()
}
init()