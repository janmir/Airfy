import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import axios from 'axios';
import anime from 'animejs'

import wifi from './wifi.svg';
import shield from './shield.svg';
import './App.css';

/************Snippets************/
//<img src={logo} className="App-logo" alt="logo" />

/************Logo************/
class Logo extends Component {
  render() {
    return (
      <div className="logo">
        Logo Here
      </div>
    );
  }
}

/************Notify************/
class Notify extends Component {
  render() {
    return (
      <div className="notify">
        You are already connected to {this.props.wifi_ssid}
      </div>
    );
  }
}


/************Input************/
class InputField extends Component {
  constructor(props) {
    super(props);

    //bindings
    this.onClickListener = this.onClickListener.bind(this);
    this.onChangeListener = this.onChangeListener.bind(this);

    //states
    this.state = {
      ssid: '',
      password: '',
      buttonLabel: 'Save',
      onClickListener: this.onClickListener
    };
  }

  onClickListener(event){
    console.info(event);

    this.setState(
      { 
        buttonLabel: 'Saving Configuration.' ,
        onClickListener: null
      }
    )

    //Send WIFI configuration - 1st send config change
    axios.get(`http://www.reddit.com/r/japanlife.json`)
    .then(res => {
      const posts = res.data.data.children.map(obj => obj.data);
      console.log(posts);

      //2nd send Config save

      //update
      this.setState({ buttonLabel: 'Saved!' })
    })
    .catch(err => {
      return err; 
    });
  }

  onChangeListener(event){
    switch(event.target.id){
      case "ssid":{
        this.setState({ssid: event.target.value});
      }break;
      case "password":{
        this.setState({password: event.target.value});
      }break;
    }

    this.setState({value: event.target.value});
  }

  render() {
      {/* <div className={`inputField ${this.props.hide  ? 'hide':'show'}`}> */}
      return (
      <div className="inputField">
        <div>
          <div className='first'><img src={wifi} className="icon" alt="wifi ssid" /></div>
          <input type="text"  name="ssid" id="ssid" 
            value={this.state.ssid} 
            onChange={this.onChangeListener} 
            placeholder="Enter Network SSID"
            className='first'/>
        </div>
        <div>
          <div className='second'><img src={shield} className="icon" alt="wifi password" /></div>
          <input type="password" name="password" id="password" 
            value={this.state.password} 
            onChange={this.onChangeListener} 
            placeholder="Enter Wifi Password"
            className='second'/>
        </div>
        <input type="button" 
            value={this.state.buttonLabel} 
            onClick={this.state.onClickListener}/>
      </div>
    );
  }
}

/************APP************/
class App extends Component {
  constructor(props) {
    super(props);

    //states
    this.state = {
      initializing: true,
      connected: false,

      ssid: 'janmir',
      ip:''
    };
  }

  componentDidMount() {
    var obj = { loading: 0 };
    
    var load_animation = anime({
      targets: obj,
      loading: 100,
      round: 1,
      easing: 'linear',
      duration: 2000,
      update: function() {
        var el = document.querySelector('#counter');
        el.innerHTML = obj.loading + "%";
      }
    });

    let timeOut = Math.floor(Math.random() * 500) + 10 ;
    setTimeout(() => load_animation.pause(), timeOut);

    axios.get(`http://www.reddit.com/r/japanlife.json`)
    .then(res => {
      load_animation.play();

      const posts = res.data.data.children.map(obj => obj.data);
      console.log(posts);

      //Set the state
      setTimeout(() => this.setState({ initializing: false }), 2100);
    })
    .catch(err => {
      return err; 
    });

  }

  render() {
    const { initializing } = this.state;
    
    if(initializing) {
      //Return initializing animation
      return (
        <div className="app center">
          <Logo/>
          <div id="counter"></div>
          <ReactCSSTransitionGroup 
            transitionName="anim" 
            transitionEnterTimeout={500} transitionAppearTimeout={500}  transitionLeaveTimeout={300} 
            transitionAppear={true} transitionEnter={true} transitionLeave={false} >
          </ReactCSSTransitionGroup>
        </div>
      );
    }else{
      const { connected } = this.state;

      //Check if already connected or not
      if(connected){
        console.log('CONNECTED!!');
        return (
          <div className="app center">
            <Logo/>
            <ReactCSSTransitionGroup 
              transitionName="anim" 
              transitionEnterTimeout={500} transitionAppearTimeout={500}  transitionLeaveTimeout={300} 
              transitionAppear={true} transitionEnter={true} transitionLeave={false} >
            <Notify 
                wifi_ssid={this.state.ssid}
                key='1'/>
            </ReactCSSTransitionGroup>
          </div>
        );
      }else{
        console.log('NOT CONNECTED!!');
        return (
          <div className="app center">
            <Logo/>
            <ReactCSSTransitionGroup 
              transitionName="anim" 
              transitionEnterTimeout={500} transitionAppearTimeout={500}  transitionLeaveTimeout={300} 
              transitionAppear={true} transitionEnter={true} transitionLeave={false} >
            <InputField
                key='0'/>
            </ReactCSSTransitionGroup>
          </div>
        );
      }
    }
  }
}

export default App;
