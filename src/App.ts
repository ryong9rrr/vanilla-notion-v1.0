import './style/index.css'
import { Modal, Sidebar } from './components'
import { README, template } from './App.template'
import { IDocument } from './models/document'
import { isNumber } from './utils/constants'
import DocumentApi from './services/document'
import { push, redirect } from './core/router'
import ContentPage from './pages/Content'
import NotFoundPage from './pages/NotFound'
import SideBar from './components/Sidebar'
import debounce from './utils/debounce'

interface State {
  path: string
  documents: IDocument[]
}

interface Props {
  rootId: string
  initialState: State
}

export default class App {
  $root: HTMLElement
  rootId: string
  state: State
  $modalContainer: HTMLElement
  $sideBarContainer: HTMLElement
  $contentContainer: HTMLElement
  documentApi = new DocumentApi()
  modalComponent: Modal
  sidebarComponent: SideBar
  contentPage: ContentPage
  constructor({ rootId, initialState }: Props) {
    this.$root = document.querySelector(rootId) as HTMLElement
    this.rootId = rootId
    this.$root.innerHTML = template
    this.state = initialState

    this.$modalContainer = this.$root.querySelector('#notion-modal-container') as HTMLElement
    this.$sideBarContainer = this.$root.querySelector('#notion-sidebar-container') as HTMLElement
    this.$contentContainer = this.$root.querySelector('#notion-content-container') as HTMLElement

    this.modalComponent = new Modal({
      parentId: '#notion-modal-container',
      onSubmit: async (parentNodeId: number, title: string) => {
        const newDocument = await this.documentApi.postNewDocument({ title, parentNodeId })
        this.sidebarComponent.setState({
          documents: await this.documentApi.getAllDocument(),
        })
        push(`/document/${newDocument.id}`)
      },
    })

    this.sidebarComponent = new Sidebar({
      parentId: '#notion-sidebar-container',
      initialState: {
        documents: this.state.documents,
      },
      onAdd: async (documentId?: string, title?: string) => {
        if (!documentId) {
          if (window.confirm(`새로운 페이지를 생성할까요?`)) {
            this.openModal()
          }
        } else {
          if (window.confirm(`${title} 페이지 아래에 하위페이지를 추가할까요?`)) {
            this.openModal(parseInt(documentId, 10))
          }
        }
      },
      onRemove: async (documentId?: string, title?: string) => {
        if (window.confirm(`${title} 페이지를 삭제할까요?`)) {
          if (documentId) {
            history.replaceState(null, '', '/')
            await this.documentApi.removeDocument(parseInt(documentId, 10))
          }

          this.sidebarComponent.setState({
            documents: await this.documentApi.getAllDocument(),
          })

          if (this.state.path.indexOf('/document/') === 0) {
            const [, , prevDocumentId] = this.state.path.split('/')
            if (documentId === prevDocumentId) {
              redirect()
            }
          }
        }
      },
    })

    this.contentPage = new ContentPage({
      parentId: '#notion-content-container',
      onEditing: async (id: number, requestBody: { title: string; content: string }) => {
        await debounce<any>(this.handleEditing(id.toString(), requestBody), 2000)
      },
    })
  }

  setState(nextState: State) {
    this.state = nextState
    this.route()
  }

  openModal(documentId?: number) {
    this.modalComponent.setState({
      isView: true,
      parentNodeId: documentId,
    })
  }

  async handleEditing(documentId: string, { title, content }: { title: string; content: string }) {
    await this.documentApi.editDocument(parseInt(documentId, 10), { title, content })
    this.sidebarComponent.setState({
      documents: await this.documentApi.getAllDocument(),
    })
  }

  async route() {
    const { path } = this.state
    this.sidebarComponent.setState({ documents: this.state.documents })
    try {
      if (path === '/') {
        this.$contentContainer.innerHTML = README
      } else if (path.includes('/document/')) {
        this.$contentContainer.innerHTML = ``
        const [, , documentId] = path.split('/')
        if (!isNumber(documentId)) throw new Error()
        const loadedContent = await this.documentApi.getDocument(parseInt(documentId, 10))
        this.contentPage.setState({ ...loadedContent })
      } else {
        new NotFoundPage({ parentId: this.rootId })
      }
    } catch (e: any) {
      console.error(
        `예상치 못한 오류가 발생하여 홈으로 리다이렉트 됩니다. 오류메시지 : ${e.message}`
      )
      redirect()
    }
  }
}
