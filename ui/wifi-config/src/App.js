import React, { Component } from 'react';
import wifi from './wifi.svg';
import shield from './shield.svg';
import './App.css';

//Snippets
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
      <div className={`notify ${this.props.hide  ? 'show':'hide'}`}>
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
      password: ''
    };
  }

  onClickListener(event){
    console.info(event);
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
    return (
      <div className={`inputField ${this.props.hide  ? 'hide':'show'}`}>
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
        <input type="button" value="Save" onClick={this.onClickListener}/>
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
      connected: false,
      ssid: 'janmir',
      ip:''
    };
  }

  render() {
    return (
      <div className="app center">
        <Logo/>
        <InputField 
          hide={this.state.connected ? true : false}/>
        <Notify 
          wifi_ssid={this.state.ssid} 
          hide={this.state.connected ? true : false}/>
      </div>
    );
  }
}

export default App;
