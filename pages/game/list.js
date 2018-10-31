import React from 'react'
import moment from 'moment'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import Link from 'next/link'
import find from 'lodash/find'
import orderBy from 'lodash/orderBy'
import withContracts from '../../lib/withContracts'
import Section, { SectionWrapper, SectionLabel, SectionContent } from '../../components/Section'
import Loader from '../../components/Loader'
import Layout from '../../components/Layout'
import Input from '../../components/Input'
import { Select, Option } from '../../components/Select'
import { List, ListItem } from '../../components/List'

const StyledButton = styled.div`
  margin-top: 50px;
  cursor: pointer;
  width: 340px;
  height: 15px;
  padding: 10px;
  border: 1px white solid;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StyledSection = styled(Section)`
  opacity: 0.5;
  ${props => !props.disable && `
    &:hover {
      opacity: 1;
    }
  `}
`

const gameOptions = [
  {
    inputKey: 'guessing_number_game',
    inputName: 'Number Guessing Game',
    rules: [
      'The person who purchase the number that has not bought more than twice',
      'If all numbers that were purchased are all purchased more than twice, banker will win',
      'Integer Only',
    ],
  },
]

const Spacer = styled.div`
  width: 100%;
  height: 40px;
`

class GameList extends React.PureComponent {
  constructor(props) {
    super(props)
    const { web3, contracts: { playerBook, numberGame } } = this.props
    this.state = {
      loadingUser: true,
      loadingGame: true,
      games: [],
      user: {
        address: '',
        balance: '0',
        claimable: '0',
        name: '',
      },
      laffUser: {
        address: '',
        balance: '0',
        claimable: '0',
        name: '',
      },
      initReward: '',
      minInitReward: '',
      selectedGameKeyName: gameOptions[0].inputKey,
    }
    this.web3 = web3
    this.playerBook = playerBook
    this.numberGame = numberGame
  }

  componentDidMount() {
    const { contractMethods: { getGameActivationFee } } = this.props
    getGameActivationFee().then(fee => this.setState({ minInitReward: fee, initReward: fee }))
    this.polling = setInterval(this.updateUserInfo, 2000)
    this.gamePolling = setInterval(this.getGames, 2000)
  }

  componentDidUpdate(prevProps, prevState) {
    const { user } = this.state
    const {
      contractMethods: {
        getUserInformationWithAddress,
      },
    } = this.props
    if (user.address && user.address !== prevState.user.address) {
      /* eslint-disable no-underscore-dangle */
      getUserInformationWithAddress(user.address)
        .then((currentUser) => {
          this.setState({
            user: Object.assign(
              {},
              user,
              {
                claimable: currentUser.claimable,
                name: currentUser.name,
              },
            ),
          })
        })
    }
  }

  componentWillUnmount() {
    if (this.polling) {
      clearInterval(this.polling)
    }
    if (this.gamePolling) {
      clearInterval(this.gamePolling)
    }
  }

  getGames = () => {
    const { contractMethods: { getGames } } = this.props
    getGames().then(games => this.setState({ games, loadingGame: false }))
  }

  updateUserInfo = () => {
    const {
      getCurrentMetaAccount,
      contractMethods: {
        getUserInformationWithAddress,
        getUserInformationWithId,
      },
    } = this.props

    getCurrentMetaAccount()
      .then(accAddress => getUserInformationWithAddress(accAddress))
      .then((user) => {
        if (!user.laff) {
          this.setState({
            user,
            loadingUser: false,
          })
        }
        getUserInformationWithId(user.laff)
          .then(laffUser => this.setState({
            user,
            laffUser,
            loadingUser: false,
          }))
      })
  }

  updateFiled = (key, value) => this.setState({ [key]: value })

  startGame = () => {
    const { contractMethods: { startNumberGame } } = this.props
    const { user, initReward } = this.state
    startNumberGame({ address: user.address, fee: initReward })
      .then((res) => {
        console.log('res', res)
      })
      .catch(err => console.log('err', err))
  }

  render() {
    const {
      games,
      user,
      laffUser,
      initReward,
      minInitReward,
      selectedGameKeyName,
      loadingUser,
      loadingGame,
    } = this.state

    const activeGames = games.filter(game => game.status === 'active')
    const inActiveGames = games.filter(game => game.status === 'finished')
    const canStartGame = user.name
    const hasRegistered = user.name
    const selectedGame = find(gameOptions, { inputKey: selectedGameKeyName })

    if (loadingUser || loadingGame) {
      return (
        <Layout>
          <Loader />
        </Layout>
      )
    }
    if (!hasRegistered) {
      return (
        <Layout>
          <SectionWrapper>
            <Section sectionTitle="User Name">
              <SectionLabel>Register Info</SectionLabel>
              <SectionContent>You need to register first before you start the game</SectionContent>
              <Link prefetch href="/user/register">
                <StyledButton>
                  Register
                </StyledButton>
              </Link>
            </Section>
          </SectionWrapper>
        </Layout>
      )
    }

    return (
      <Layout>
        <SectionWrapper>
          <Section sectionTitle="User Wallet Info">
            <SectionLabel>Address</SectionLabel>
            <SectionContent>{user.address}</SectionContent>
            <SectionLabel>Balance</SectionLabel>
            <SectionContent>{user.balance}</SectionContent>
          </Section>
          { !hasRegistered && (
            <Section sectionTitle="User Name">
              <SectionLabel>Register Info</SectionLabel>
              <SectionContent>You need to register first before you start the game</SectionContent>
              <Link prefetch href="/user/register">
                <StyledButton>
                  Register
                </StyledButton>
              </Link>
            </Section>
          ) }
          { hasRegistered && (
            <Section sectionTitle="User Book">
              <SectionLabel>Name</SectionLabel>
              <SectionContent>{user.name}</SectionContent>
              <SectionLabel>Claimable</SectionLabel>
              <SectionContent>{user.claimable}</SectionContent>
            </Section>
          ) }
          { hasRegistered && (
            <Section sectionTitle="Laff User Book">
              <SectionLabel>Name</SectionLabel>
              <SectionContent>{laffUser.name}</SectionContent>
              <SectionLabel>Claimable</SectionLabel>
              <SectionContent>{laffUser.claimable}</SectionContent>
            </Section>
          ) }
        </SectionWrapper>
        <SectionWrapper>
          {activeGames.length > 0 && orderBy(activeGames.map(x => ({ ...x, num: Number(x.winningAmount) })), ['num'], ['desc'])
            .map(activeGame => (
              <Section sectionTitle="Active Game" key={`${activeGame.id}-section`}>
                <SectionLabel>Game Index</SectionLabel>
                <SectionContent>{activeGame.id}</SectionContent>
                <SectionLabel>Current Winning Pot</SectionLabel>
                <SectionContent>{activeGame.winningAmount}</SectionContent>
                <SectionLabel>Banker</SectionLabel>
                <SectionContent>{activeGame.banker.name}</SectionContent>
                <SectionLabel>Count Down</SectionLabel>
                <SectionContent>
                  {moment.utc(moment(activeGame.endTime).diff(moment())).format('HH:mm:ss')}
                </SectionContent>
                <br />
                <Link prefetch href={`/game/${activeGame.id}`}>
                  <StyledButton>
                    Go To Game
                  </StyledButton>
                </Link>
              </Section>
            ))}
        </SectionWrapper>
        {inActiveGames.length !== 0 && (
          <SectionWrapper>
            {inActiveGames.map(game => (
              <StyledSection
                sectionTitle={`Game ID ${game.id}`}
                key={`${game.id}-styled-section`}
                disable
              >
                <SectionLabel>ID</SectionLabel>
                <SectionContent>{game.id}</SectionContent>
                <SectionLabel>Banker Name</SectionLabel>
                <SectionContent>{game.banker.name}</SectionContent>
                <SectionLabel>Game Period</SectionLabel>
                <SectionContent>
                  {moment(game.startTime).format('YYYY-MM-DD HH:mm:ss')}
                  {' ~ '}
                  {moment(game.endTime).format('YYYY-MM-DD HH:mm:ss')}
                </SectionContent>
                <SectionLabel>Game Status</SectionLabel>
                <SectionContent>{game.status}</SectionContent>
              </StyledSection>
            ))}
          </SectionWrapper>
        )}
        { canStartGame && (
        <SectionWrapper>
          <Section sectionTitle="Game Start Setting">
            <Select>
              {gameOptions.map(gameOption => (
                <Option
                  key={gameOption.inputKey}
                  value={gameOption.inputKey}
                >
                  {gameOption.inputName}
                </Option>
              ))}
            </Select>
            <List>
              {selectedGame && selectedGame.rules.map(rule => (
                <ListItem key={rule}>
                  {rule}
                </ListItem>
              ))}
            </List>
            <Spacer />
            <Input
              isDisabled
              disabled
              type="text"
              value={find(gameOptions, { inputKey: selectedGameKeyName }).inputName}
              label="Game"
            />
            <Spacer />
            {
              [
                { value: 'ETH', label: 'Currency' },
                { value: '5', label: 'Snapshot Winner' },
                { value: '0.22', label: 'Snapshot Number' },
                { value: '0.55', label: 'Buy Number' },
              ]
                .map(x => (
                  <React.Fragment key={`${x.value}-${x.label}`}>
                    <Input
                      isDisabled
                      type="text"
                      value={x.value}
                      label={x.label}
                    />
                    <Spacer />
                  </React.Fragment>
                ))
            }
            <Input
              type="number"
              value={initReward}
              label="Initial Pot Amount"
              min={minInitReward}
              onChange={e => this.updateFiled('initReward', e.target.value)}
            />
            <StyledButton onClick={() => this.startGame()}>
              GO
            </StyledButton>
          </Section>
        </SectionWrapper>
        ) }
      </Layout>
    )
  }
}

GameList.propTypes = {
  contracts: PropTypes.object, /* eslint-disable-line */
  web3: PropTypes.object, /* eslint-disable-line */
  contractMethods: PropTypes.object, /* eslint-disable-line */
  getCurrentMetaAccount: PropTypes.func, /* eslint-disable-line */
}

export default withContracts(GameList)
